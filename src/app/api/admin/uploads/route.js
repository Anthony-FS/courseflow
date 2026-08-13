import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  extensionFromName,
  validateUpload,
} from "@/lib/admin-uploads";

export async function POST(request) {
  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart form data", 400);
  }

  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  const validation = validateUpload(kind, file);

  if (!validation.ok) {
    return jsonError(validation.message, validation.status);
  }

  const { config } = validation;
  const ext = extensionFromName(file.name);
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(config.bucket)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return jsonError(uploadError.message || "Upload failed", 500);
  }

  return jsonOk({
    bucket: config.bucket,
    path,
    fileUrl: `${config.bucket}/${path}`,
    fileType: file.type || ext,
    name: file.name,
  });
}
