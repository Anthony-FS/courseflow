import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  enrollUserInCourse,
  getUserEnrolledCourses,
} from "@/lib/enrollments";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  try {
    const courses = await getUserEnrolledCourses(supabase, user.id);
    return jsonOk({ courses });
  } catch (loadError) {
    return jsonError(loadError.message || "Failed to load enrolled courses", 500);
  }
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

  try {
    const enrollment = await enrollUserInCourse(supabase, user.id, courseId);
    return jsonOk(
      { ok: true, already: enrollment.already, id: enrollment.id },
      { status: enrollment.already ? 200 : 201 },
    );
  } catch (enrollError) {
    return jsonError(enrollError.message || "Failed to subscribe to this course", 500);
  }
}
