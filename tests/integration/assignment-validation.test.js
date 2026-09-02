import { describe, expect, it } from "vitest";

import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import {
  assignmentAnswerColumns,
  canonicalizeChoiceLetters,
  choiceAnswersMatch,
  formatCorrectChoiceLabel,
  isValidChoiceAnswer,
  mapAssignmentAnswerFields,
  parseChoiceLetters,
  toggleChoiceLetter,
  validateAssignmentFields,
} from "@/lib/assignment-validation";

describe("assignment field validation", () => {
  const valid = {
    courseId: "course-1",
    lessonId: "lesson-1",
    subLessonId: "sub-1",
    title: "Week 1 homework",
    description: "",
    submissionType: "text",
    allowedFileTypes: [],
    answerText: "A model answer",
    choiceA: "",
    choiceB: "",
    choiceC: "",
    choiceD: "",
    correctChoice: "",
  };

  it("accepts a valid text assignment with an empty description", () => {
    expect(validateAssignmentFields(valid)).toEqual({});
  });

  it("requires course, lesson, sub-lesson, and title", () => {
    const errors = validateAssignmentFields({
      ...valid,
      courseId: "",
      lessonId: "  ",
      subLessonId: "",
      title: "   ",
    });

    expect(errors.courseId).toBe(EMPTY_FIELD_MESSAGE);
    expect(errors.lessonId).toBe(EMPTY_FIELD_MESSAGE);
    expect(errors.subLessonId).toBe(EMPTY_FIELD_MESSAGE);
    expect(errors.title).toBe(EMPTY_FIELD_MESSAGE);
    expect(errors.description).toBeUndefined();
  });

  it("requires answer text for text submission", () => {
    expect(
      validateAssignmentFields({
        ...valid,
        answerText: "   ",
      }).answerText,
    ).toBe(EMPTY_FIELD_MESSAGE);
  });

  it("requires all four choices and a correct letter for 4-choice", () => {
    const errors = validateAssignmentFields({
      ...valid,
      submissionType: "choice",
      answerText: "",
      choiceA: "One",
      choiceB: "",
      choiceC: "Three",
      choiceD: "Four",
      correctChoice: "",
    });

    expect(errors.choiceB).toBe(EMPTY_FIELD_MESSAGE);
    expect(errors.correctChoice).toBe(EMPTY_FIELD_MESSAGE);
    expect(errors.answerText).toBeUndefined();
  });

  it("rejects a correct letter that is not A–D", () => {
    expect(
      validateAssignmentFields({
        ...valid,
        submissionType: "choice",
        answerText: "",
        choiceA: "One",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "a",
      }).correctChoice,
    ).toBe(EMPTY_FIELD_MESSAGE);
  });

  it("accepts a complete 4-choice assignment", () => {
    expect(
      validateAssignmentFields({
        ...valid,
        submissionType: "choice",
        answerText: "",
        choiceA: "One",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "B",
      }),
    ).toEqual({});
  });

  it("accepts multiple correct letters", () => {
    expect(
      validateAssignmentFields({
        ...valid,
        submissionType: "choice",
        answerText: "",
        choiceA: "One",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "A,C",
      }),
    ).toEqual({});
  });

  it("requires allowed files only for file upload", () => {
    expect(
      validateAssignmentFields({
        ...valid,
        submissionType: "file",
        allowedFileTypes: [],
      }).allowedFileTypes,
    ).toBe(EMPTY_FIELD_MESSAGE);

    expect(
      validateAssignmentFields({
        ...valid,
        submissionType: "file",
        allowedFileTypes: ["pdf"],
      }),
    ).toEqual({});

    expect(
      validateAssignmentFields({
        ...valid,
        submissionType: "url",
        allowedFileTypes: [],
        answerText: "",
      }).allowedFileTypes,
    ).toBeUndefined();
  });
});

describe("assignmentAnswerColumns", () => {
  it("stores trimmed answer_text for text and nulls choices", () => {
    expect(
      assignmentAnswerColumns("text", { answerText: "  Hello  " }),
    ).toEqual({
      columns: {
        answer_text: "Hello",
        choice_a: null,
        choice_b: null,
        choice_c: null,
        choice_d: null,
        correct_choice: null,
      },
      error: null,
    });
  });

  it("rejects blank text answers", () => {
    expect(assignmentAnswerColumns("text", { answerText: "  " })).toEqual({
      columns: null,
      error: EMPTY_FIELD_MESSAGE,
    });
  });

  it("stores four choices and the correct letter", () => {
    expect(
      assignmentAnswerColumns("choice", {
        choiceA: " One ",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "C",
      }),
    ).toEqual({
      columns: {
        answer_text: null,
        choice_a: "One",
        choice_b: "Two",
        choice_c: "Three",
        choice_d: "Four",
        correct_choice: "C",
      },
      error: null,
    });
  });

  it("canonicalizes multiple correct letters", () => {
    expect(
      assignmentAnswerColumns("choice", {
        choiceA: "One",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "C,A",
      }),
    ).toEqual({
      columns: {
        answer_text: null,
        choice_a: "One",
        choice_b: "Two",
        choice_c: "Three",
        choice_d: "Four",
        correct_choice: "A,C",
      },
      error: null,
    });
  });

  it("canonicalizes duplicate letters", () => {
    expect(
      assignmentAnswerColumns("choice", {
        choiceA: "One",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "A,A",
      }).columns.correct_choice,
    ).toBe("A");
  });

  it("rejects incomplete 4-choice payloads", () => {
    expect(
      assignmentAnswerColumns("choice", {
        choiceA: "One",
        choiceB: "Two",
        choiceC: "Three",
        choiceD: "Four",
        correctChoice: "E",
      }),
    ).toEqual({
      columns: null,
      error: EMPTY_FIELD_MESSAGE,
    });
  });

  it("nulls all answer-key columns for file and url", () => {
    expect(
      assignmentAnswerColumns("file", { answerText: "ignore" }),
    ).toEqual({
      columns: {
        answer_text: null,
        choice_a: null,
        choice_b: null,
        choice_c: null,
        choice_d: null,
        correct_choice: null,
      },
      error: null,
    });

    expect(assignmentAnswerColumns("url", {})).toEqual({
      columns: {
        answer_text: null,
        choice_a: null,
        choice_b: null,
        choice_c: null,
        choice_d: null,
        correct_choice: null,
      },
      error: null,
    });
  });
});

describe("choice letter helpers", () => {
  it("parses a single letter and a comma list", () => {
    expect(parseChoiceLetters("C")).toEqual(["C"]);
    expect(parseChoiceLetters("A,C")).toEqual(["A", "C"]);
    expect(parseChoiceLetters("C,A")).toEqual(["A", "C"]);
    expect(parseChoiceLetters("A,A,E,C")).toEqual(["A", "C"]);
    expect(parseChoiceLetters("")).toEqual([]);
  });

  it("canonicalizes to a sorted unique comma list", () => {
    expect(canonicalizeChoiceLetters("C")).toBe("C");
    expect(canonicalizeChoiceLetters("C,A")).toBe("A,C");
    expect(canonicalizeChoiceLetters("A,A")).toBe("A");
    expect(canonicalizeChoiceLetters("E")).toBe("");
    expect(canonicalizeChoiceLetters("")).toBe("");
  });

  it("treats a non-empty canonical list as valid", () => {
    expect(isValidChoiceAnswer("C")).toBe(true);
    expect(isValidChoiceAnswer("A,C")).toBe(true);
    expect(isValidChoiceAnswer("C,A")).toBe(true);
    expect(isValidChoiceAnswer("")).toBe(false);
    expect(isValidChoiceAnswer("E")).toBe(false);
  });

  it("matches only when both sides canonicalize to the same non-empty list", () => {
    expect(choiceAnswersMatch("A,C", "C,A")).toBe(true);
    expect(choiceAnswersMatch("C", "C")).toBe(true);
    expect(choiceAnswersMatch("A,C", "A")).toBe(false);
    expect(choiceAnswersMatch("A,C", "A,B,C")).toBe(false);
    expect(choiceAnswersMatch("", "C")).toBe(false);
    expect(choiceAnswersMatch("", "")).toBe(false);
  });

  it("formats the incorrect-answer label", () => {
    expect(formatCorrectChoiceLabel("C")).toBe("Correct answer is C");
    expect(formatCorrectChoiceLabel("A,C")).toBe("Correct answers are A and C");
    expect(formatCorrectChoiceLabel("A,B,C")).toBe(
      "Correct answers are A, B, and C",
    );
  });

  it("toggles a letter in the canonical list", () => {
    expect(toggleChoiceLetter("", "B")).toBe("B");
    expect(toggleChoiceLetter("B", "D")).toBe("B,D");
    expect(toggleChoiceLetter("B,D", "B")).toBe("D");
    expect(toggleChoiceLetter("A", "E")).toBe("A");
  });
});

describe("mapAssignmentAnswerFields", () => {
  it("maps null row values to empty strings", () => {
    expect(
      mapAssignmentAnswerFields({
        answer_text: null,
        choice_a: null,
        choice_b: null,
        choice_c: null,
        choice_d: null,
        correct_choice: null,
      }),
    ).toEqual({
      answerText: "",
      choiceA: "",
      choiceB: "",
      choiceC: "",
      choiceD: "",
      correctChoice: "",
    });
  });
});
