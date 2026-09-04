import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { getEnrolledAssignment } from "@/lib/student-assignment-access";
import {
  sanitizeSubmissionFileName,
  validateStudentUploadFile,
} from "@/lib/student-submission-validation";

const BUCKET = "assignment-submissions";

export async function POST(request, { params }) {
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

  if (assignment.submission_type !== "file") {
    return jsonError("This assignment does not accept file uploads.", 400);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart form data", 400);
  }

  const file = formData.get("file");
  const validation = validateStudentUploadFile(
    file,
    assignment.allowed_file_types,
    assignment.max_file_size_mb,
  );
  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  const name = sanitizeSubmissionFileName(file.name);
  const path = `${user.id}/${assignment.id}/${name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    return jsonError(uploadError.message || "Upload failed", 500);
  }

  return jsonOk({ path, name });
}
