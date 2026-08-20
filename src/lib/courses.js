import { createClient } from "@/lib/supabase/client";

const FALLBACK_COVER = "/courses/service-design.svg";

export function resolveCoverUrl(coverFileUrl) {
  if (!coverFileUrl) {
    return FALLBACK_COVER;
  }

  if (/^https?:\/\//i.test(coverFileUrl) || coverFileUrl.startsWith("/")) {
    return coverFileUrl;
  }

  return FALLBACK_COVER;
}

function mapCourse(row) {
  const lessonCount = Array.isArray(row.sub_lessons)
    ? (row.sub_lessons[0]?.count ?? 0)
    : 0;

  return {
    id: row.id,
    title: row.title,
    cover_file_url: resolveCoverUrl(row.cover_file_url),
    cover_file_type: row.cover_file_type,
    price: row.price ?? 0,
    lesson_count: lessonCount,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function getCourses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, cover_file_url, cover_file_type, price, created_at, updated_at, sub_lessons(count)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCourse);
}

export function searchCourses(courses, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return courses;
  }

  return courses.filter((course) =>
    course.title.toLowerCase().includes(normalizedQuery),
  );
}

export async function deleteCourse(id) {
  const supabase = createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
