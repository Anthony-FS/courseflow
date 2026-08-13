import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const UPLOAD_KINDS = {
  cover: {
    bucket: "course-covers",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/jpg"],
  },
  trailer: {
    bucket: "course-trailers",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/avi",
    ],
  },
  attachment: {
    bucket: "course-attachments",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: null,
  },
};

function extensionFromName(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "bin";
}

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
  const config = UPLOAD_KINDS[kind];

  if (!config) {
    return jsonError(
      'Invalid kind. Use "cover", "trailer", or "attachment".',
      400,
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return jsonError("File is required", 400);
  }

  if (file.size > config.maxBytes) {
    return jsonError(
      `File exceeds max size of ${Math.round(config.maxBytes / (1024 * 1024))} MB`,
      400,
    );
  }

  if (config.mimeTypes && !config.mimeTypes.includes(file.type)) {
    return jsonError(`Unsupported file type: ${file.type || "unknown"}`, 400);
  }

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
