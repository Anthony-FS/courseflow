import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { isCourseEnrolled } from "@/lib/enrollments";
import { recordSubLessonProgress } from "@/lib/course-learn-progress";

const ACTIONS = new Set(["visit", "complete", "submit_assignment"]);

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
  const subLessonId = String(body.subLessonId ?? "").trim();
  const action = String(body.action ?? "").trim();

  if (!courseId) {
    return jsonError("Course id is required", 400);
  }
  if (!subLessonId) {
    return jsonError("Sub-lesson id is required", 400);
  }
  if (!ACTIONS.has(action)) {
    return jsonError("Invalid progress action", 400);
  }

  const enrolled = await isCourseEnrolled(supabase, user.id, courseId);
  if (!enrolled) {
    return jsonError("You must be enrolled in this course", 403);
  }

  const { data: subLesson, error: subLessonError } = await supabase
    .from("sub_lessons")
    .select("id, course_id")
    .eq("id", subLessonId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (subLessonError) {
    return jsonError(subLessonError.message || "Failed to load sub-lesson", 500);
  }

  if (!subLesson?.id) {
    return jsonError("Sub-lesson not found", 404);
  }

  try {
    const result = await recordSubLessonProgress(supabase, {
      userId: user.id,
      courseId,
      subLessonId,
      action,
    });

    return jsonOk(
      { ok: true, id: result.id, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (progressError) {
    return jsonError(progressError.message || "Failed to save progress", 500);
  }
}
