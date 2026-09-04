import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import {
  ADMIN_ASSIGNMENT_CREATE_RATE_LIMIT,
  ADMIN_ASSIGNMENT_CREATE_RATE_WINDOW_MS,
  ADMIN_SEARCH_RATE_LIMIT,
  ADMIN_SEARCH_RATE_WINDOW_MS,
  adminAssignmentCreateRateLimitKey,
  adminSearchRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { formatCourseDate } from "@/lib/format";
import {
  SUBMISSION_TYPES,
  assignmentAnswerColumns,
} from "@/lib/assignment-validation";
import { processAdminAssignments } from "@/lib/admin-assignment-list";

export const ADMIN_ASSIGNMENT_COLUMNS = `
  id,
  title,
  description,
  created_at,
  updated_at,
  is_active,
  course:courses ( title ),
  subLesson:sub_lessons ( title, lesson:lessons ( title ) )
`;

export function mapAdminAssignment(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    courseTitle: row.course?.title ?? "-",
    lessonTitle: row.subLesson?.lesson?.title ?? "-",
    subLessonTitle: row.subLesson?.title ?? "-",
    createdDateLabel: row.created_at ? formatCourseDate(row.created_at) : "-",
    updatedDateLabel: row.updated_at ? formatCourseDate(row.updated_at) : "-",
    is_active: row.is_active !== false,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function GET(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const limited = checkRateLimit(adminSearchRateLimitKey(getClientIp(request)), {
    limit: ADMIN_SEARCH_RATE_LIMIT,
    windowMs: ADMIN_SEARCH_RATE_WINDOW_MS,
  });
  if (!limited.allowed) {
    return jsonTooManyRequests(limited.retryAfterSec);
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
  const query = String(searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";

  const { data, error: queryError } = await supabase
    .from("assignments")
    .select(ADMIN_ASSIGNMENT_COLUMNS);

  if (queryError) return jsonError(queryError.message || "Failed to load assignments", 500);

  const processed = processAdminAssignments((data ?? []).map(mapAdminAssignment), {
    query,
    status,
    sortBy,
    sortDirection,
    page,
    pageSize,
  });

  return jsonOk({ ...processed, page, pageSize });
}

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
  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  const limited = checkRateLimit(
    adminAssignmentCreateRateLimitKey(user?.id),
    {
      limit: ADMIN_ASSIGNMENT_CREATE_RATE_LIMIT,
      windowMs: ADMIN_ASSIGNMENT_CREATE_RATE_WINDOW_MS,
    },
  );
  if (!limited.allowed) {
    return jsonTooManyRequests(
      limited.retryAfterSec,
      "Too many assignment creates, try again in a moment",
    );
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

  const { columns: answerColumns, error: answerError } =
    assignmentAnswerColumns(submissionType, body);

  if (answerError) {
    return jsonError(answerError, 400);
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
      ...answerColumns,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return jsonError(insertError?.message || "Failed to create assignment", 500);
  }

  return jsonOk({ success: true, id: data.id }, { status: 201 });
}
