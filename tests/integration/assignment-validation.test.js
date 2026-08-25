import { describe, expect, it } from "vitest";

import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import {
  assignmentAnswerColumns,
  mapAssignmentAnswerFields,
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
