import { resolveAttachmentHref, resolveTrailerUrl } from "@/lib/courses";
import {
  BLOCK_TYPES,
  hasVideoContentBlock,
  migrateLegacyAttachmentIntoBlocks,
  migrateLegacyVideoIntoBlocks,
  parseSubLessonContent,
  serializeSubLessonContent,
} from "@/lib/sub-lesson-blocks";

/** Flatten lessons → ordered sub-lessons for prev/next navigation. */
export function flattenSubLessons(lessons) {
  return (lessons ?? []).flatMap((lesson) =>
    (lesson.subLessons ?? []).map((subLesson) => ({
      id: subLesson.id,
      title: subLesson.title ?? "",
      lessonId: lesson.id,
      lessonTitle: lesson.title ?? "",
    })),
  );
}

/**
 * Resolve the active sub-lesson from `?subLessonId=`, defaulting to the first.
 * Also returns previous / next siblings in course order.
 */
export function resolveActiveSubLesson(flatSubLessons, subLessonId) {
  const list = flatSubLessons ?? [];
  if (list.length === 0) {
    return { active: null, index: -1, prev: null, next: null };
  }

  const requestedId = String(subLessonId ?? "").trim();
  const foundIndex = requestedId
    ? list.findIndex((item) => item.id === requestedId)
    : -1;
  const index = foundIndex >= 0 ? foundIndex : 0;

  return {
    active: list[index],
    index,
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  };
}

/**
 * Badge status:
 * - completed (full green): only after Next Lesson (`completedIds`)
 * - pending-assignment (yellow half): visited lesson with unfinished assignment
 * - in-progress (green half): visited or currently active, but not completed
 * - not-started (empty green): never visited
 * Visiting alone must never produce a full green badge.
 */
export function withMockLessonStatuses(
  lessons,
  activeSubLessonId,
  completedIds = [],
  {
    visitedIds = [],
    assignmentSubLessonIds = [],
    submittedAssignmentSubLessonIds = [],
  } = {},
) {
  const completed = new Set(completedIds);
  const visited = new Set(visitedIds);
  const hasAssignment = new Set(assignmentSubLessonIds);
  const assignmentSubmitted = new Set(submittedAssignmentSubLessonIds);

  return (lessons ?? []).map((lesson) => ({
    ...lesson,
    subLessons: (lesson.subLessons ?? []).map((subLesson) => {
      const id = subLesson.id;
      const assignmentOpen =
        hasAssignment.has(id) && !assignmentSubmitted.has(id);
      const wasVisited = visited.has(id) || id === activeSubLessonId;
      let status = "not-started";

      if (completed.has(id) && !assignmentOpen) {
        status = "completed";
      } else if (wasVisited && assignmentOpen) {
        status = "pending-assignment";
      } else if (wasVisited) {
        status = "in-progress";
      }

      return { ...subLesson, status };
    }),
  }));
}

export function mockProgressPercent(lessonsWithStatus) {
  const all = (lessonsWithStatus ?? []).flatMap(
    (lesson) => lesson.subLessons ?? [],
  );
  if (all.length === 0) {
    return 0;
  }
  const completed = all.filter((item) => item.status === "completed").length;
  return Math.round((completed / all.length) * 100);
}

export function learnSubLessonHref(courseCode, subLessonId) {
  const code = encodeURIComponent(String(courseCode ?? "").trim());
  const id = encodeURIComponent(String(subLessonId ?? "").trim());
  return `/courses/${code}/learn?subLessonId=${id}`;
}

function isVideoMaterial(row) {
  const type = String(row?.file_type ?? "").toLowerCase();
  return type.startsWith("video/") || type === "video";
}

export function pickVideoMaterial(materials) {
  const rows = Array.isArray(materials) ? materials : [];
  return (
    rows.find((row) => isVideoMaterial(row) && row.file_url) ??
    rows.find((row) => {
      const url = String(row?.file_url ?? "").toLowerCase();
      return (
        Boolean(row?.file_url) &&
        (url.includes("course-trailers") ||
          url.includes("trailer") ||
          /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url))
      );
    }) ??
    null
  );
}

export function pickAttachmentMaterial(materials) {
  const rows = Array.isArray(materials) ? materials : [];
  const videoMaterial = pickVideoMaterial(rows);

  return (
    rows.find(
      (row) =>
        row !== videoMaterial &&
        row?.file_url &&
        !isVideoMaterial(row) &&
        !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(row.file_url ?? "")),
    ) ?? null
  );
}

async function withAttachmentDownloadUrls(supabase, blocks) {
  return Promise.all(
    (blocks ?? []).map(async (block) => {
      if (block?.type !== BLOCK_TYPES.ATTACHMENT || !block.url) {
        return block;
      }

      const value = String(block.url).trim();
      if (!value || value.startsWith("blob:") || value.startsWith("data:")) {
        return block;
      }

      const downloadUrl = await resolveAttachmentHref(supabase, value);
      return downloadUrl ? { ...block, downloadUrl } : block;
    }),
  );
}

/**
 * Load learner-facing sub-lesson content (title, description, video).
 * Uses service/catalog client after enrollment is verified on the page.
 */
export async function getSubLessonLearningContent(
  supabase,
  { courseId, subLessonId },
) {
  const id = String(subLessonId ?? "").trim();
  const course = String(courseId ?? "").trim();
  if (!supabase || !id || !course) {
    return null;
  }

  const [
    { data: subLesson, error: subError },
    { data: materials, error: materialsError },
  ] = await Promise.all([
    supabase
      .from("sub_lessons")
      .select("id, title, description")
      .eq("id", id)
      .eq("course_id", course)
      .maybeSingle(),
    supabase
      .from("materials")
      .select("name, file_url, file_type")
      .eq("sub_lesson_id", id)
      .eq("course_id", course),
  ]);

  if (subError || materialsError || !subLesson) {
    return null;
  }

  const videoMaterial = pickVideoMaterial(materials);
  const attachmentMaterial = pickAttachmentMaterial(materials);
  const blocks = migrateLegacyAttachmentIntoBlocks(
    migrateLegacyVideoIntoBlocks(
      parseSubLessonContent(subLesson.description ?? ""),
      videoMaterial?.file_url,
      videoMaterial?.name ?? "",
    ),
    attachmentMaterial?.file_url,
    attachmentMaterial?.name ?? "",
    attachmentMaterial?.file_type ?? "",
  );
  const blocksWithDownloadUrls = await withAttachmentDownloadUrls(
    supabase,
    blocks,
  );
  const description = serializeSubLessonContent(blocksWithDownloadUrls);
  const hasBlockVideo = hasVideoContentBlock(blocksWithDownloadUrls);

  return {
    title: subLesson.title ?? "",
    description,
    videoUrl:
      hasBlockVideo || !videoMaterial?.file_url
        ? null
        : resolveTrailerUrl(videoMaterial.file_url),
    videoName: hasBlockVideo ? "" : (videoMaterial?.name ?? ""),
  };
}

/** Learner-safe assignment fields (no answer keys). */
export function mapLearnerAssignment(row) {
  return {
    id: row.id,
    subLessonId: row.sub_lesson_id,
    title: row.title ?? "",
    description: row.description ?? "",
    submissionType: row.submission_type ?? "text",
    choiceA: row.choice_a ?? "",
    choiceB: row.choice_b ?? "",
    choiceC: row.choice_c ?? "",
    choiceD: row.choice_d ?? "",
    allowedFileTypes: row.allowed_file_types ?? [],
    maxFileSizeMb: row.max_file_size_mb ?? 5,
    answerText: "",
    correctChoice: "",
  };
}

export async function getAssignmentsForCourse(supabase, courseId) {
  const course = String(courseId ?? "").trim();
  if (!supabase || !course) {
    return [];
  }

  const { data, error } = await supabase
    .from("assignments")
    .select(
      "id, sub_lesson_id, title, description, submission_type, choice_a, choice_b, choice_c, choice_d, allowed_file_types, max_file_size_mb",
    )
    .eq("course_id", course)
    .order("title", { ascending: true });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.filter((row) => row.sub_lesson_id).map(mapLearnerAssignment);
}

export async function getUserAssignmentSubmission(
  supabase,
  userId,
  assignmentId,
) {
  const user = String(userId ?? "").trim();
  const id = String(assignmentId ?? "").trim();
  if (!supabase || !user || !id) {
    return null;
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("content, status, submitted_at")
    .eq("assignment_id", id)
    .eq("user_id", user)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    content: data.content ?? "",
    status: data.status ?? null,
    submittedAt: data.submitted_at ?? null,
  };
}

/** Attach answer keys only after the learner has submitted. */
export async function withAssignmentAnswerKeys(supabase, assignment) {
  if (!supabase || !assignment?.id) {
    return assignment;
  }

  const { data, error } = await supabase
    .from("assignments")
    .select("answer_text, correct_choice, submission_type")
    .eq("id", assignment.id)
    .maybeSingle();

  if (error || !data) {
    return assignment;
  }

  const type = data.submission_type ?? assignment.submissionType;
  return {
    ...assignment,
    answerText: type === "text" ? String(data.answer_text ?? "").trim() : "",
    correctChoice:
      type === "choice" ? String(data.correct_choice ?? "").trim() : "",
  };
}
