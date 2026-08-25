import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  SUBMISSION_TYPES,
  assignmentAnswerColumns,
  mapAssignmentAnswerFields,
} from "@/lib/assignment-validation";

const FILE_TYPES = ["pdf", "doc", "image"];
const MAX_FILE_SIZES = [5, 10, 20, 50];

function parseAllowedFileTypes(value) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  ];
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return jsonError("Assignment id is required", 400);
  }

  const { data, error: assignmentError } = await supabase
    .from("assignments")
    .select(`
      id,
      course_id,
      sub_lesson_id,
      title,
      description,
      submission_type,
      allowed_file_types,
      max_file_size_mb,
      answer_text,
      choice_a,
      choice_b,
      choice_c,
      choice_d,
      correct_choice,
      subLesson:sub_lessons (
        lesson_id
      )
    `)
    .eq("id", id)
    .single();

  if (assignmentError || !data) {
    return jsonError("Assignment not found", 404);
  }

  const subLesson = Array.isArray(data.subLesson)
    ? data.subLesson[0]
    : data.subLesson;

  return jsonOk({
    assignment: {
      id: data.id,
      courseId: data.course_id,
      lessonId: subLesson?.lesson_id ?? "",
      subLessonId: data.sub_lesson_id,
      title: data.title,
      description: data.description ?? "",
      submissionType: data.submission_type ?? "text",
      allowedFileTypes: data.allowed_file_types ?? [],
      maxFileSizeMb: data.max_file_size_mb ?? 20,
      ...mapAssignmentAnswerFields(data),
    },
  });
}

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return jsonError("Assignment id is required", 400);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const courseId = String(body.courseId ?? "").trim();
  const lessonId = String(body.lessonId ?? "").trim();
  const subLessonId = String(body.subLessonId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const submissionType = String(body.submissionType ?? "text").trim();
  const allowedFileTypes = parseAllowedFileTypes(body.allowedFileTypes);
  const maxFileSizeMb = Number(body.maxFileSizeMb);

  if (!courseId || !lessonId || !subLessonId) {
    return jsonError(
      "Course, lesson, and sub-lesson are required",
      400,
    );
  }

  if (!title) {
    return jsonError("Assignment title is required", 400);
  }

  if (!SUBMISSION_TYPES.includes(submissionType)) {
    return jsonError("Invalid submission type.", 400);
  }

  let storedFileTypes = null;
  let storedMaxSize = null;

  if (submissionType === "file") {
    const validFileTypes = allowedFileTypes.filter((type) =>
      FILE_TYPES.includes(type),
    );

    if (validFileTypes.length === 0) {
      return jsonError(
        "Select at least one allowed file type.",
        400,
      );
    }

    if (!MAX_FILE_SIZES.includes(maxFileSizeMb)) {
      return jsonError("Select a valid max file size.", 400);
    }

    storedFileTypes = validFileTypes;
    storedMaxSize = maxFileSizeMb;
  }

  const { columns: answerColumns, error: answerError } =
    assignmentAnswerColumns(submissionType, body);

  if (answerError) {
    return jsonError(answerError, 400);
  }

  const { data, error: updateError } = await supabase
    .from("assignments")
    .update({
      course_id: courseId,
      sub_lesson_id: subLessonId,
      title,
      description,
      submission_type: submissionType,
      allowed_file_types: storedFileTypes,
      max_file_size_mb: storedMaxSize,
      ...answerColumns,
    })
    .eq("id", id)
    .select("id")
    .single();

  if (updateError || !data) {
    return jsonError(
      updateError?.message || "Failed to update assignment",
      500,
    );
  }

  return jsonOk({ success: true, id: data.id });
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return jsonError("Assignment id is required", 400);
  }

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return jsonError(
      deleteError.message || "Failed to delete assignment",
      500,
    );
  }

  return jsonOk({ success: true });
}