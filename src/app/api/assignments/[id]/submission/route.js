import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { isUniqueViolation } from "@/lib/course-validation";
import { getEnrolledAssignment } from "@/lib/student-assignment-access";
import {
  answerKeyFields,
  validateStudentSubmissionContent,
} from "@/lib/student-submission-validation";

export async function PUT(request, { params }) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const { assignment, error: accessError } = await getEnrolledAssignment(
    supabase,
    user.id,
    id,
  );
  if (accessError) {
    return jsonError(accessError.message, accessError.status);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const validated = validateStudentSubmissionContent(
    assignment.submission_type,
    body?.content,
    { userId: user.id, assignmentId: assignment.id },
  );
  if (!validated.ok) {
    return jsonError(validated.message, 400);
  }

  const submittedAt = new Date().toISOString();
  const row = {
    assignment_id: assignment.id,
    user_id: user.id,
    content: validated.content,
    status: "submitted",
    submitted_at: submittedAt,
  };

  const { data: existing, error: existingError } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignment.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message || "Failed to load submission", 500);
  }

  let created = false;

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        content: row.content,
        status: row.status,
        submitted_at: row.submitted_at,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (updateError) {
      return jsonError(updateError.message || "Failed to update submission", 500);
    }
  } else {
    const { error: insertError } = await supabase.from("submissions").insert(row);

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        const { error: updateError } = await supabase
          .from("submissions")
          .update({
            content: row.content,
            status: row.status,
            submitted_at: row.submitted_at,
          })
          .eq("assignment_id", assignment.id)
          .eq("user_id", user.id);

        if (updateError) {
          return jsonError(
            updateError.message || "Failed to update submission",
            500,
          );
        }
      } else {
        return jsonError(insertError.message || "Failed to save submission", 500);
      }
    } else {
      created = true;
    }
  }

  return jsonOk(
    {
      ok: true,
      content: validated.content,
      submittedAt,
      status: "submitted",
      ...answerKeyFields(assignment.submission_type, assignment),
    },
    { status: created ? 201 : 200 },
  );
}
