import { createClient } from "@/lib/supabase/client";

const FALLBACK_COVER = "/courses/service-design.svg";
const COVER_BUCKET = "course-covers";

function toPublicStorageUrl(objectPath, supabaseUrl) {
  const base = String(supabaseUrl ?? "").replace(/\/$/, "");
  if (!base || !objectPath) {
    return null;
  }

  const encodedPath = String(objectPath)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `${base}/storage/v1/object/public/${encodedPath}`;
}

export function resolveCoverUrl(
  coverFileUrl,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const value = String(coverFileUrl ?? "").trim();
  if (!value) {
    return FALLBACK_COVER;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }

  const objectPath = value.startsWith(`${COVER_BUCKET}/`)
    ? value
    : `${COVER_BUCKET}/${value}`;
  const publicUrl = toPublicStorageUrl(objectPath, supabaseUrl);

  return publicUrl || FALLBACK_COVER;
}

export { FALLBACK_COVER };

export function embeddedCount(value) {
  return Array.isArray(value) ? (value[0]?.count ?? 0) : 0;
}

function mapCourse(row) {
  return {
    id: row.id,
    title: row.title,
    course_code: row.course_code ?? "",
    cover_file_url: resolveCoverUrl(row.cover_image_url || row.cover_file_url),
    cover_file_type: row.cover_file_type,
    price: row.price ?? 0,
    lesson_count: embeddedCount(row.lessons),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function getCourses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, course_code, cover_file_url, cover_file_type, cover_image_url, price, created_at, updated_at, lessons(count)",
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

  return courses.filter((course) => {
    const title = course.title.toLowerCase();
    const courseCode = (course.course_code ?? "").toLowerCase();

    return title.includes(normalizedQuery) || courseCode.includes(normalizedQuery);
  });
}

export async function deleteCourse(id) {
  const response = await fetch(`/api/admin/courses/${id}`, {
    method: "DELETE",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete this course.");
  }
}
