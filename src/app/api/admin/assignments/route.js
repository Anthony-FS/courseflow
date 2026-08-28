import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { formatCourseDate } from "@/lib/format";
import {
  SUBMISSION_TYPES,
  assignmentAnswerColumns,
} from "@/lib/assignment-validation";

const ADMIN_ASSIGNMENT_COLUMNS = `
  id,
  title,
  description,
  start_at,
  end_at,
  course:courses ( title ),
  subLesson:sub_lessons ( title, lesson:lessons ( title ) )
`;

function mapAdminAssignment(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    courseTitle: row.course?.title ?? "-",
    lessonTitle: row.subLesson?.lesson?.title ?? "-",
    subLessonTitle: row.subLesson?.title ?? "-",
    dateLabel: row.start_at ? formatCourseDate(row.start_at) : "-",
  };
}

export async function GET(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
  const query = String(searchParams.get("q") ?? "").trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let requestQuery = supabase
    .from("assignments")
    .select(ADMIN_ASSIGNMENT_COLUMNS, { count: "exact" });

  if (query) {
    const escaped = query.replace(/[(),"]/g, " ").replaceAll("%", "\\%").replaceAll("_", "\\_");
    requestQuery = requestQuery.ilike("title", `%${escaped}%`);
  }

  const { data, count, error: queryError } = await requestQuery
    .order("start_at", { ascending: false })
    .range(from, to);

  if (queryError) return jsonError(queryError.message || "Failed to load assignments", 500);

  return jsonOk({ assignments: (data ?? []).map(mapAdminAssignment), total: count ?? 0, page, pageSize });
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
