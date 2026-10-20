import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { touchCourseUpdatedAt } from "@/lib/touch-course";
import {
  cleanupUnusedLessonMedia,
  collectLessonMediaUrls,
} from "@/lib/course-media-storage";
import { collectMediaUrlsFromSubLessonRecords } from "@/lib/sub-lesson-blocks";

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(str ?? "").trim(),
  );
}

async function replaceSubLessonMaterials(supabase, courseId, subLessonId, sub) {
  const { error: deleteError } = await supabase
    .from("materials")
    .delete()
    .eq("sub_lesson_id", subLessonId);

  if (deleteError) return deleteError;

  if (sub.videoUrl) {
    const { error } = await supabase.from("materials").insert({
      course_id: courseId,
      sub_lesson_id: subLessonId,
      name: String(sub.videoName || `${sub.title} Video`).trim(),
      file_url: String(sub.videoUrl),
      file_type: "video/mp4",
    });
    if (error) return error;
  }

  if (sub.attachmentUrl) {
    const { error } = await supabase.from("materials").insert({
      course_id: courseId,
      sub_lesson_id: subLessonId,
      name: String(sub.attachmentName || `${sub.title} Attachment`).trim(),
      file_url: String(sub.attachmentUrl),
      file_type: String(sub.attachmentType || "application/pdf"),
    });
    if (error) return error;
  }

  return null;
}

async function resolveLessonId(supabase, lessonId) {
  if (isValidUUID(lessonId)) {
    return lessonId;
  }

  try {
    const query = supabase.from("lessons").select("id");
    const result = typeof query?.limit === "function" ? await query.limit(1) : await query;
    const firstLesson = Array.isArray(result?.data) ? result.data[0] : result?.data;

    if (firstLesson?.id) {
      return firstLesson.id;
    }
  } catch {
    // Ignore fallback errors
  }

  return lessonId || "00000000-0000-0000-0000-000000000001";
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId, lessonId: rawLessonId } = await params;
  if (!courseId || !rawLessonId) {
    return jsonError("Course id and Lesson id are required", 400);
  }

  const lessonId = await resolveLessonId(supabase, rawLessonId);
  if (!lessonId) {
    return jsonOk({ lesson: null });
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(`
      id,
      title,
      sort_order,
      sub_lessons (
        id,
        title,
        description,
        sort_order,
        materials (
          id,
          name,
          file_url,
          file_type
        )
      )
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    return jsonOk({ lesson: null });
  }

  const sortedSubLessons = (lesson.sub_lessons || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((sub) => {
      const materials = Array.isArray(sub.materials)
        ? sub.materials
        : sub.materials
          ? [sub.materials]
          : [];
      const videoMaterial = materials.find(
        (m) =>
          m.file_type?.startsWith("video/") ||
          m.file_url?.includes("course-trailers") ||
          m.file_url?.includes("trailer") ||
          /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(m.file_url ?? "")),
      );
      const attachmentMaterial = materials.find((m) => m !== videoMaterial);

      return {
        id: sub.id,
        title: sub.title,
        description: sub.description || "",
        videoUrl: videoMaterial?.file_url || null,
        videoName: videoMaterial?.name || "",
        videoFile: null,
        attachmentUrl: attachmentMaterial?.file_url || null,
        attachmentName: attachmentMaterial?.name || "",
        attachmentType: attachmentMaterial?.file_type || null,
        attachmentFile: null,
      };
    });

  return jsonOk({
    lesson: {
      id: lesson.id,
      name: lesson.title,
      subLessons: sortedSubLessons,
    },
  });
}

export async function PUT(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId, lessonId: rawLessonId } = await params;
  if (!courseId || !rawLessonId) {
    return jsonError("Course id and Lesson id are required", 400);
  }

  const lessonId = await resolveLessonId(supabase, rawLessonId);
  if (!lessonId) {
    return jsonError("Lesson not found", 404);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const lessonName = String(body.lessonName ?? "").trim();
  const subLessons = Array.isArray(body.subLessons) ? body.subLessons : [];

  if (!lessonName) {
    return jsonError("Lesson name is required", 400);
  }

  if (subLessons.length === 0) {
    return jsonError("At least one sub-lesson is required", 400);
  }

  for (let i = 0; i < subLessons.length; i++) {
    if (!String(subLessons[i].title ?? "").trim()) {
      return jsonError(`Sub-lesson #${i + 1} name is required`, 400);
    }
  }

  // 1. Update lesson title
  const { error: updateLessonError } = await supabase
    .from("lessons")
    .update({ title: lessonName })
    .eq("id", lessonId);

  if (updateLessonError) {
    return jsonError(updateLessonError.message || "Failed to update lesson", 500);
  }

  // Keep existing sub-lesson ids. Assignments and learner progress point at
  // those ids; deleting and recreating the rows detaches them.
  const previousUrls = await collectLessonMediaUrls(supabase, lessonId);

  const { data: existingSubLessons, error: existingError } = await supabase
    .from("sub_lessons")
    .select("id")
    .eq("lesson_id", lessonId);

  if (existingError) {
    return jsonError(existingError.message || "Failed to load sub-lessons", 500);
  }

  const existingIds = new Set(
    (existingSubLessons ?? []).map((row) => row.id).filter(Boolean),
  );
  const keptIds = [];

  for (let i = 0; i < subLessons.length; i++) {
    const sub = subLessons[i];
    const requestedId = isValidUUID(sub.id) ? String(sub.id).trim() : "";
    const fields = {
      title: String(sub.title).trim(),
      description: sub.description ? String(sub.description).trim() : null,
      sort_order: i + 1,
    };

    let subLessonId = requestedId && existingIds.has(requestedId) ? requestedId : "";

    if (subLessonId) {
      const { error: updateError } = await supabase
        .from("sub_lessons")
        .update(fields)
        .eq("id", subLessonId)
        .eq("lesson_id", lessonId);

      if (updateError) {
        return jsonError(updateError.message || "Failed to update sub-lesson", 500);
      }
    } else {
      const { data: created, error: subError } = await supabase
        .from("sub_lessons")
        .insert({
          course_id: courseId,
          lesson_id: lessonId,
          ...fields,
        })
        .select("id")
        .single();

      if (subError || !created?.id) {
        return jsonError(subError?.message || "Failed to create sub-lesson", 500);
      }

      subLessonId = created.id;
    }

    keptIds.push(subLessonId);

    const materialError = await replaceSubLessonMaterials(
      supabase,
      courseId,
      subLessonId,
      sub,
    );
    if (materialError) {
      return jsonError(
        materialError.message || "Failed to update sub-lesson files",
        500,
      );
    }
  }

  const removedIds = [...existingIds].filter((id) => !keptIds.includes(id));
  for (const removedId of removedIds) {
    const { error: deleteError } = await supabase
      .from("sub_lessons")
      .delete()
      .eq("id", removedId);

    if (deleteError) {
      return jsonError(
        deleteError.message || "Failed to delete removed sub-lessons",
        500,
      );
    }
  }

  await cleanupUnusedLessonMedia(
    supabase,
    previousUrls,
    collectMediaUrlsFromSubLessonRecords(subLessons),
  );

  await touchCourseUpdatedAt(supabase, courseId);

  return jsonOk({ success: true });
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId, lessonId: rawLessonId } = await params;
  if (!courseId || !rawLessonId) {
    return jsonError("Course id and Lesson id are required", 400);
  }

  const lessonId = await resolveLessonId(supabase, rawLessonId);
  if (!lessonId) {
    return jsonOk({ success: true });
  }

  const previousUrls = await collectLessonMediaUrls(supabase, lessonId);

  const { error: subLessonError } = await supabase
    .from("sub_lessons")
    .delete()
    .eq("lesson_id", lessonId);

  if (subLessonError) {
    return jsonError(
      subLessonError.message || "Failed to delete lesson sub-lessons",
      500,
    );
  }

  const { error: deleteError } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (deleteError) {
    return jsonError(deleteError.message || "Failed to delete lesson", 500);
  }

  await cleanupUnusedLessonMedia(supabase, previousUrls, []);
  await touchCourseUpdatedAt(supabase, courseId);

  return jsonOk({ success: true });
}
