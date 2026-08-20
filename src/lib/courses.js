import { createClient } from "@/lib/supabase/client";

const FALLBACK_COVER = "/courses/service-design.svg";
const COVER_BUCKET = "course-covers";
const TRAILER_BUCKET = "course-trailers";
const ATTACHMENT_BUCKET = "course-attachments";

const COURSE_DETAIL_COLUMNS =
  "id, title, summary, description, price, cover_image_url, cover_file_url, video_trailer_url";
const COURSE_DETAIL_WITH_LESSONS = `${COURSE_DETAIL_COLUMNS}, lessons ( id, title, sort_order, sub_lessons ( id, title, sort_order ) )`;

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

export function resolveTrailerUrl(
  videoTrailerUrl,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const value = String(videoTrailerUrl ?? "").trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }

  const objectPath = value.startsWith(`${TRAILER_BUCKET}/`)
    ? value
    : `${TRAILER_BUCKET}/${value}`;

  return toPublicStorageUrl(objectPath, supabaseUrl);
}

async function resolveAttachmentHref(supabase, fileUrl) {
  const value = String(fileUrl ?? "").trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }

  const objectPath = value.startsWith(`${ATTACHMENT_BUCKET}/`)
    ? value.slice(ATTACHMENT_BUCKET.length + 1)
    : value;

  if (typeof supabase?.storage?.from === "function") {
    const { data } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(objectPath, 60 * 60);

    if (data?.signedUrl) {
      return data.signedUrl;
    }
  }

  const objectWithBucket = value.startsWith(`${ATTACHMENT_BUCKET}/`)
    ? value
    : `${ATTACHMENT_BUCKET}/${objectPath}`;
  return toPublicStorageUrl(
    objectWithBucket,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export async function getCourseAttachment(supabase, courseId) {
  if (!courseId) {
    return null;
  }

  const query = supabase
    .from("materials")
    .select("id, name, file_url, file_type, sub_lesson_id")
    .eq("course_id", courseId);

  const { data, error } =
    typeof query.is === "function"
      ? await query.is("sub_lesson_id", null)
      : await query;

  if (error) {
    return null;
  }

  const rows = Array.isArray(data) ? data : [];
  const row = rows.find((item) => item.sub_lesson_id == null) ?? rows[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name ?? "Attachment",
    fileUrl: await resolveAttachmentHref(supabase, row.file_url),
    fileType: row.file_type ?? "",
  };
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

function sortByOrder(items) {
  return [...items].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
}

export function mapCourseDetail(row) {
  const lessons = sortByOrder(row.lessons ?? []).map((lesson) => ({
    id: lesson.id,
    title: lesson.title ?? "",
    subLessons: sortByOrder(lesson.sub_lessons ?? []).map((subLesson) => ({
      id: subLesson.id,
      title: subLesson.title ?? "",
    })),
  }));

  return {
    id: row.id,
    title: row.title ?? "",
    summary: row.summary ?? "",
    description: row.description ?? "",
    price: row.price ?? 0,
    coverUrl: resolveCoverUrl(row.cover_image_url || row.cover_file_url),
    trailerUrl: resolveTrailerUrl(row.video_trailer_url),
    lessons,
  };
}

async function fetchLessonsForCourse(supabase, courseId) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, sort_order, sub_lessons ( id, title, sort_order )")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function getCourseByCode(supabase, code, catalogSupabase) {
  const courseCode = String(code ?? "").trim();
  if (!courseCode) {
    return null;
  }

  const catalog = catalogSupabase ?? supabase;

  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_DETAIL_WITH_LESSONS)
    .eq("id", courseCode)
    .maybeSingle();

  if (!error && data) {
    const nestedLessons = Array.isArray(data.lessons) ? data.lessons : [];
    if (nestedLessons.length > 0) {
      return mapCourseDetail(data);
    }

    const lessons = await fetchLessonsForCourse(catalog, data.id);
    return mapCourseDetail({ ...data, lessons });
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select(COURSE_DETAIL_COLUMNS)
    .eq("id", courseCode)
    .maybeSingle();

  if (courseError || !course) {
    return null;
  }

  const lessons = await fetchLessonsForCourse(catalog, course.id);
  return mapCourseDetail({ ...course, lessons });
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
