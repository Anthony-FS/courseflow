export const UPLOAD_KINDS = {
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

/**
 * Validate upload kind + file before Storage upload.
 * @returns {{ ok: true, config: object } | { ok: false, message: string, status: number }}
 */
export function validateUpload(kind, file) {
  const config = UPLOAD_KINDS[kind];

  if (!config) {
    return {
      ok: false,
      status: 400,
      message: 'Invalid kind. Use "cover", "trailer", or "attachment".',
    };
  }

  if (
    !(file instanceof Blob) ||
    typeof file.name !== "string" ||
    file.name.length === 0 ||
    file.size === 0
  ) {
    return {
      ok: false,
      status: 400,
      message: "File is required",
    };
  }

  if (file.size > config.maxBytes) {
    return {
      ok: false,
      status: 400,
      message: `File exceeds max size of ${Math.round(config.maxBytes / (1024 * 1024))} MB`,
    };
  }

  if (config.mimeTypes && !config.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      status: 400,
      message: `Unsupported file type: ${file.type || "unknown"}`,
    };
  }

  return { ok: true, config };
}

export function extensionFromName(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "bin";
}
