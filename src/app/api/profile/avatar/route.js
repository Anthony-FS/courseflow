import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const BUCKET = "profile-avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function POST(request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart form data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || !file.name || file.size === 0) {
    return jsonError("Photo is required", 400);
  }

  if (!MIME_EXTENSIONS[file.type]) {
    return jsonError("Only JPG and PNG photos are supported", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError("Photo must be 5 MB or smaller", 400);
  }

  const path = `${user.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return jsonError(uploadError.message || "Failed to upload photo", 500);
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);
  const avatarUrl = publicData?.publicUrl;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError || !avatarUrl) {
    await supabase.storage.from(BUCKET).remove([path]);
    return jsonError(profileError?.message || "Failed to save photo", 500);
  }

  return jsonOk({ avatarUrl });
}
