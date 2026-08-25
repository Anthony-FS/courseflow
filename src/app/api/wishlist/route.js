import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

function isUniqueViolation(error) {
  return error?.code === "23505";
}

export async function POST(request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const courseId = String(body.courseId ?? "").trim();
  if (!courseId) {
    return jsonError("Course id is required", 400);
  }

  let { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course && !courseError) {
    const { data: byCode } = await supabase
      .from("courses")
      .select("id")
      .ilike("course_code", courseId)
      .maybeSingle();
    if (byCode) {
      course = byCode;
    }
  }

  if (courseError) {
    return jsonError(courseError.message || "Failed to load course", 500);
  }

  if (!course?.id) {
    return jsonError("Course not found", 404);
  }

  const resolvedCourseId = course.id;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", resolvedCourseId)
    .maybeSingle();

  if (enrollmentError) {
    return jsonError(
      enrollmentError.message || "Failed to check enrollment",
      500,
    );
  }

  if (enrollment?.id) {
    return jsonError(
      "You already own this course and cannot add it to your wishlist",
      400,
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", resolvedCourseId)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message || "Failed to load wishlist", 500);
  }

  if (existing?.id) {
    return jsonOk({ ok: true, already: true, id: existing.id });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("wishlists")
    .insert({
      user_id: user.id,
      course_id: resolvedCourseId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      return jsonOk({ ok: true, already: true });
    }

    return jsonError(insertError.message || "Failed to add to wishlist", 500);
  }

  return jsonOk({ ok: true, already: false, id: inserted?.id ?? null }, { status: 201 });
}

export async function DELETE(request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let courseId = "";
  try {
    const url = new URL(request.url);
    courseId = url.searchParams.get("courseId")?.trim() || "";
  } catch {
    courseId = "";
  }

  if (!courseId) {
    try {
      const body = await request.json();
      courseId = String(body.courseId ?? "").trim();
    } catch {
      // JSON body was optional
    }
  }

  if (!courseId) {
    return jsonError("Course id is required", 400);
  }

  let resolvedCourseId = courseId;
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    const { data: byCode } = await supabase
      .from("courses")
      .select("id")
      .ilike("course_code", courseId)
      .maybeSingle();
    if (byCode?.id) {
      resolvedCourseId = byCode.id;
    }
  }

  const { error: deleteError } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("course_id", resolvedCourseId);

  if (deleteError) {
    return jsonError(deleteError.message || "Failed to remove from wishlist", 500);
  }

  return jsonOk({ ok: true });
}

