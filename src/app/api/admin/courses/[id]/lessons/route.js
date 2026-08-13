import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

function mapLesson(row) {
  const subLessonCount = Array.isArray(row.sub_lessons)
    ? (row.sub_lessons[0]?.count ?? 0)
    : 0;

  return {
    id: row.id,
    name: row.title,
    subLessons: subLessonCount,
    sortOrder: row.sort_order,
  };
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) {
    return jsonError("Course id is required", 400);
  }

  const { data, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, sort_order, sub_lessons(count)")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (lessonsError) {
    return jsonError(lessonsError.message || "Failed to load lessons", 500);
  }

  return jsonOk({ lessons: (data ?? []).map(mapLesson) });
}
