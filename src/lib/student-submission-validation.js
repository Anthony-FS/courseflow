import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import { CHOICE_LETTERS } from "@/lib/assignment-validation";

export const INVALID_URL_MESSAGE = "Enter a valid URL.";
export const INVALID_FILE_PATH_MESSAGE = "Invalid file path.";

export const STUDENT_FILE_TYPE_LABELS = {
  pdf: "PDF",
  doc: "DOC/DOCX",
  image: "Image",
};

export const STUDENT_FILE_ACCEPT = {
  pdf: ".pdf,application/pdf",
  doc: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  image: ".jpg,.jpeg,.png,image/jpeg,image/png",
};

const FILE_KIND_MATCHERS = {
  pdf: {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
  },
  doc: {
    extensions: ["doc", "docx"],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  image: {
    extensions: ["jpg", "jpeg", "png"],
    mimeTypes: ["image/jpeg", "image/jpg", "image/png"],
  },
};

function extensionOf(name = "") {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeSubmissionFileName(name) {
  const normalized = String(name ?? "").replace(/[/\\]/g, "_");
  const cleaned = normalized.replace(/[<>:"|?*]/g, "_").trim();
  return cleaned || "file";
}

export function isOwnedSubmissionPath(path, userId, assignmentId) {
  const value = String(path ?? "");
  if (value.includes("..")) return false;
  const prefix = `${userId}/${assignmentId}/`;
  if (!value.startsWith(prefix)) return false;
  const fileName = value.slice(prefix.length);
  return fileName.length > 0 && !fileName.includes("/");
}

export function fileNameFromStoragePath(path) {
  const value = String(path ?? "");
  const name = value.split("/").filter(Boolean).pop();
  return name || "file";
}

export function validateStudentSubmissionContent(
  submissionType,
  content,
  { userId, assignmentId },
) {
  const trimmed = String(content ?? "").trim();

  if (submissionType === "text") {
    if (!trimmed) return { ok: false, message: EMPTY_FIELD_MESSAGE };
    return { ok: true, content: trimmed };
  }

  if (submissionType === "url") {
    if (!trimmed) return { ok: false, message: EMPTY_FIELD_MESSAGE };
    if (!isHttpUrl(trimmed)) {
      return { ok: false, message: INVALID_URL_MESSAGE };
    }
    return { ok: true, content: trimmed };
  }

  if (submissionType === "choice") {
    if (!CHOICE_LETTERS.includes(trimmed)) {
      return { ok: false, message: EMPTY_FIELD_MESSAGE };
    }
    return { ok: true, content: trimmed };
  }

  if (submissionType === "file") {
    if (!trimmed) return { ok: false, message: EMPTY_FIELD_MESSAGE };
    if (!isOwnedSubmissionPath(trimmed, userId, assignmentId)) {
      return { ok: false, message: INVALID_FILE_PATH_MESSAGE };
    }
    return { ok: true, content: trimmed };
  }

  return { ok: false, message: "Invalid submission type." };
}

export function validateStudentUploadFile(
  file,
  allowedFileTypes,
  maxFileSizeMb,
) {
  if (
    !(file instanceof Blob) ||
    typeof file.name !== "string" ||
    file.name.length === 0 ||
    file.size === 0
  ) {
    return { ok: false, message: EMPTY_FIELD_MESSAGE };
  }

  const types = Array.isArray(allowedFileTypes) ? allowedFileTypes : [];
  const maxBytes = Number(maxFileSizeMb) * 1024 * 1024;
  const ext = extensionOf(file.name);
  const mime = String(file.type ?? "").toLowerCase();

  const matchesKind = types.some((kind) => {
    const matcher = FILE_KIND_MATCHERS[kind];
    if (!matcher) return false;
    return (
      matcher.extensions.includes(ext) || matcher.mimeTypes.includes(mime)
    );
  });

  if (!matchesKind) {
    return {
      ok: false,
      message: `Unsupported file type: ${file.type || ext || "unknown"}`,
    };
  }

  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || file.size > maxBytes) {
    return {
      ok: false,
      message: `File exceeds max size of ${maxFileSizeMb} MB`,
    };
  }

  return { ok: true };
}

export function answerKeyFields(submissionType, assignmentRow) {
  if (submissionType === "text") {
    const answerText = String(assignmentRow?.answer_text ?? "").trim();
    return answerText ? { answerText } : {};
  }

  if (submissionType === "choice") {
    const correctChoice = String(assignmentRow?.correct_choice ?? "").trim();
    return CHOICE_LETTERS.includes(correctChoice)
      ? { correctChoice }
      : {};
  }

  return {};
}
