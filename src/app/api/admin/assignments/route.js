import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const SUBMISSION_TYPES = ["text", "file", "url"];
const FILE_TYPES = ["pdf", "doc", "image"];
const MAX_FILE_SIZES = [5, 10, 20, 50];

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

function parseAllowedFileTypes(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

export async function POST(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

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

  if (isBlank(courseId) || isBlank(lessonId) || isBlank(subLessonId)) {
    return jsonError("Course, lesson, and sub-lesson are required", 400);
  }

  if (isBlank(title)) {
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
      return jsonError("Select at least one allowed file type.", 400);
    }

    if (!MAX_FILE_SIZES.includes(maxFileSizeMb)) {
      return jsonError("Select a valid max file size.", 400);
    }

    storedFileTypes = validFileTypes;
    storedMaxSize = maxFileSizeMb;
  }

  const { data, error: insertError } = await supabase
    .from("assignments")
    .insert({
      course_id: courseId,
      sub_lesson_id: subLessonId,
      title,
      description,
      submission_type: submissionType,
      allowed_file_types: storedFileTypes,
      max_file_size_mb: storedMaxSize,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return jsonError(insertError?.message || "Failed to create assignment", 500);
  }

  return jsonOk({ success: true, id: data.id }, { status: 201 });
}
