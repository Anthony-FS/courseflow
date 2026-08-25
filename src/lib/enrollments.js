import { resolveCoverUrl } from "@/lib/courses";

function isUniqueViolation(error) {
  return error?.code === "23505";
}

export async function enrollUserInCourse(supabase, userId, courseId) {
  if (!userId || !courseId) {
    throw new Error("User id and course id are required.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to load enrollment.");
  }

  if (existing?.id) {
    return { already: true, id: existing.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      return { already: true, id: null };
    }
    throw new Error(insertError.message || "Failed to subscribe to this course.");
  }

  return { already: false, id: inserted?.id ?? null };
}

export async function isCourseEnrolled(supabase, userId, courseId) {
  if (!userId || !courseId) {
    return false;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data?.id);
}

export async function enrollInCourse(courseId) {
  const response = await fetch("/api/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to subscribe to this course.");
  }

  return data;
}

function lessonCount(lessons) {
  if (Array.isArray(lessons)) return lessons.length;
  if (lessons && typeof lessons === "object" && "count" in lessons) {
    return lessons.count;
  }
  return 0;
}

function mapEnrolledCourse(enrollment) {
  const course = Array.isArray(enrollment.courses)
    ? enrollment.courses[0]
    : enrollment.courses;

  if (!course) return null;

  return {
    enrollmentId: enrollment.id,
    enrolledAt: enrollment.subscribed_at,
    id: course.id,
    code: course.course_code || course.id,
    title: course.title || "",
    summary: course.summary || "",
    description: course.description || "",
    totalLearningTime: course.total_learning_time || "",
    coverUrl: resolveCoverUrl(
      course.cover_image_url || course.cover_file_url,
    ),
    price: course.price ?? 0,
    lessonCount: lessonCount(course.lessons),
  };
}

export async function getUserEnrolledCourses(supabase, userId) {
  if (!supabase || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      subscribed_at,
      course_id,
      courses (
        id,
        title,
        course_code,
        summary,
        description,
        total_learning_time,
        cover_image_url,
        cover_file_url,
        price,
        lessons ( id )
      )
    `)
    .eq("user_id", userId)
    .order("subscribed_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load enrolled courses.");
  }

  return (data ?? []).map(mapEnrolledCourse).filter(Boolean);
}

export async function loadMyCourses() {
  const response = await fetch("/api/enrollments", {
    method: "GET",
    cache: "no-store",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to load your courses.");
  }

  return Array.isArray(data?.courses) ? data.courses : [];
}
