import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

/**
 * Validate Add Assignment fields shown in the admin form.
 * @returns {Record<string, string>} map of field key → error message
 */
export function validateAssignmentFields({
  courseId,
  lessonId,
  subLessonId,
  title,
  submissionType,
  allowedFileTypes,
}) {
  const errors = {};

  if (isBlank(courseId)) errors.courseId = EMPTY_FIELD_MESSAGE;
  if (isBlank(lessonId)) errors.lessonId = EMPTY_FIELD_MESSAGE;
  if (isBlank(subLessonId)) errors.subLessonId = EMPTY_FIELD_MESSAGE;
  if (isBlank(title)) errors.title = EMPTY_FIELD_MESSAGE;

  if (submissionType === "file") {
    const types = Array.isArray(allowedFileTypes) ? allowedFileTypes : [];
    if (types.length === 0) {
      errors.allowedFileTypes = EMPTY_FIELD_MESSAGE;
    }
  }

  return errors;
}
