import { describe, expect, it } from "vitest";

import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import { validateAssignmentFields } from "@/lib/assignment-validation";

describe("assignment field validation", () => {
  const valid = {
    courseId: "course-1",
    lessonId: "lesson-1",
    subLessonId: "sub-1",
    title: "Week 1 homework",
    description: "",
    submissionType: "text",
    allowedFileTypes: [],
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
      }).allowedFileTypes,
    ).toBeUndefined();
  });
});
