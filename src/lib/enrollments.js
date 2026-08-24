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
