import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";

export const SUBMISSION_TYPES = ["text", "file", "url", "choice"];
export const CHOICE_LETTERS = ["A", "B", "C", "D"];

export const EMPTY_ANSWER_COLUMNS = {
  answer_text: null,
  choice_a: null,
  choice_b: null,
  choice_c: null,
  choice_d: null,
  correct_choice: null,
};

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
  answerText,
  choiceA,
  choiceB,
  choiceC,
  choiceD,
  correctChoice,
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

  if (submissionType === "text" && isBlank(answerText)) {
    errors.answerText = EMPTY_FIELD_MESSAGE;
  }

  if (submissionType === "choice") {
    if (isBlank(choiceA)) errors.choiceA = EMPTY_FIELD_MESSAGE;
    if (isBlank(choiceB)) errors.choiceB = EMPTY_FIELD_MESSAGE;
    if (isBlank(choiceC)) errors.choiceC = EMPTY_FIELD_MESSAGE;
    if (isBlank(choiceD)) errors.choiceD = EMPTY_FIELD_MESSAGE;
    if (!CHOICE_LETTERS.includes(String(correctChoice ?? "").trim())) {
      errors.correctChoice = EMPTY_FIELD_MESSAGE;
    }
  }

  return errors;
}

/**
 * Map a JSON body to assignment answer-key columns for insert/update.
 * @returns {{ columns: typeof EMPTY_ANSWER_COLUMNS | null, error: string | null }}
 */
export function assignmentAnswerColumns(submissionType, body) {
  if (submissionType === "text") {
    const answerText = String(body.answerText ?? "").trim();
    if (!answerText) {
      return { columns: null, error: EMPTY_FIELD_MESSAGE };
    }

    return {
      columns: { ...EMPTY_ANSWER_COLUMNS, answer_text: answerText },
      error: null,
    };
  }

  if (submissionType === "choice") {
    const choiceA = String(body.choiceA ?? "").trim();
    const choiceB = String(body.choiceB ?? "").trim();
    const choiceC = String(body.choiceC ?? "").trim();
    const choiceD = String(body.choiceD ?? "").trim();
    const correctChoice = String(body.correctChoice ?? "").trim();

    if (
      !choiceA ||
      !choiceB ||
      !choiceC ||
      !choiceD ||
      !CHOICE_LETTERS.includes(correctChoice)
    ) {
      return { columns: null, error: EMPTY_FIELD_MESSAGE };
    }

    return {
      columns: {
        answer_text: null,
        choice_a: choiceA,
        choice_b: choiceB,
        choice_c: choiceC,
        choice_d: choiceD,
        correct_choice: correctChoice,
      },
      error: null,
    };
  }

  return { columns: { ...EMPTY_ANSWER_COLUMNS }, error: null };
}

export function mapAssignmentAnswerFields(row) {
  return {
    answerText: row.answer_text ?? "",
    choiceA: row.choice_a ?? "",
    choiceB: row.choice_b ?? "",
    choiceC: row.choice_c ?? "",
    choiceD: row.choice_d ?? "",
    correctChoice: row.correct_choice ?? "",
  };
}
