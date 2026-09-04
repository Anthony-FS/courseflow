import { formatCourseDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

function mapAssignment(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    courseTitle: row.course?.title ?? "-",
    lessonTitle: row.subLesson?.lesson?.title ?? "-",
    subLessonTitle: row.subLesson?.title ?? "-",
    dateLabel: row.start_at
      ? formatCourseDate(row.start_at)
      : "-",
  };
}

export async function getAssignments() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select(`
      id,
      title,
      description,
      start_at,
      end_at,
      course:courses (
        title
      ),
      subLesson:sub_lessons (
        title,
        lesson:lessons (
          title
        )
      )
    `)
    .order("start_at", { ascending: false });

  if (error) {
    throw error;
  }


  return (data ?? []).map(mapAssignment);
}

export function searchAssignments(assignments, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return assignments;
  }

  return assignments.filter((assignment) => {
    const searchableText = [
      assignment.title,
      assignment.courseTitle,
      assignment.lessonTitle,
      assignment.subLessonTitle,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}