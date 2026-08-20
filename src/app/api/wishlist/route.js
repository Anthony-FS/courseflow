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

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    return jsonError(courseError.message || "Failed to load course", 500);
  }

  if (!course?.id) {
    return jsonError("Course not found", 404);
  }

  const { data: existing, error: existingError } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
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
      course_id: courseId,
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
