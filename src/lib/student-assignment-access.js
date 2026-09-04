import { isCourseEnrolled } from "@/lib/enrollments";

export async function getEnrolledAssignment(supabase, userId, assignmentId) {
  const id = String(assignmentId ?? "").trim();
  if (!id) {
    return { assignment: null, error: { status: 400, message: "Assignment id is required" } };
  }

  const { data, error } = await supabase
    .from("assignments")
    .select(`
      id,
      course_id,
      submission_type,
      allowed_file_types,
      max_file_size_mb,
      answer_text,
      correct_choice
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      assignment: null,
      error: { status: 500, message: error.message || "Failed to load assignment" },
    };
  }

  if (!data?.id) {
    return { assignment: null, error: { status: 404, message: "Assignment not found" } };
  }

  const enrolled = await isCourseEnrolled(supabase, userId, data.course_id);
  if (!enrolled) {
    return { assignment: null, error: { status: 403, message: "Forbidden" } };
  }

  return { assignment: data, error: null };
}
