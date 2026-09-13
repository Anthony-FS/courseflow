import { describe, expect, it } from "vitest";

import {
  canCompleteSubLesson,
  courseProgressPercent,
  deriveSubLessonStatus,
  SUB_LESSON_STATUS,
  withSubLessonStatuses,
} from "@/lib/sub-lesson-status";

const lessons = [
  {
    id: "l1",
    title: "Introduction",
    subLessons: [
      { id: "s1", title: "Welcome" },
      { id: "s2", title: "Four Levels" },
    ],
  },
  {
    id: "l2",
    title: "Theories",
    subLessons: [{ id: "s3", title: "Principles" }],
  },
];

function statuses(lessonsWithStatus) {
  return lessonsWithStatus.flatMap((lesson) =>
    lesson.subLessons.map((subLesson) => subLesson.status),
  );
}

describe("deriveSubLessonStatus", () => {
  it("starts at Default until the sub-lesson is viewed", () => {
    expect(deriveSubLessonStatus({})).toBe(SUB_LESSON_STATUS.NOT_STARTED);
    expect(deriveSubLessonStatus({ hasAssignment: true })).toBe(
      SUB_LESSON_STATUS.NOT_STARTED,
    );
  });

  it("moves to In progress once viewed", () => {
    expect(deriveSubLessonStatus({ visited: true })).toBe(
      SUB_LESSON_STATUS.IN_PROGRESS,
    );
  });

  it("shows Pending Assignment while an assignment is unfinished", () => {
    expect(
      deriveSubLessonStatus({ visited: true, hasAssignment: true }),
    ).toBe(SUB_LESSON_STATUS.PENDING_ASSIGNMENT);
  });

  it("returns to In progress once the assignment is submitted", () => {
    expect(
      deriveSubLessonStatus({
        visited: true,
        hasAssignment: true,
        assignmentSubmitted: true,
      }),
    ).toBe(SUB_LESSON_STATUS.IN_PROGRESS);
  });

  it("reaches Completed only from a persisted completion", () => {
    expect(deriveSubLessonStatus({ visited: true, completed: true })).toBe(
      SUB_LESSON_STATUS.COMPLETED,
    );
    expect(
      deriveSubLessonStatus({
        visited: true,
        completed: true,
        hasAssignment: true,
        assignmentSubmitted: true,
      }),
    ).toBe(SUB_LESSON_STATUS.COMPLETED);
  });

  it("never shows Completed while an assignment is unfinished", () => {
    expect(
      deriveSubLessonStatus({
        visited: true,
        completed: true,
        hasAssignment: true,
      }),
    ).toBe(SUB_LESSON_STATUS.PENDING_ASSIGNMENT);
  });
});

describe("withSubLessonStatuses", () => {
  it("annotates every sub-lesson and counts only completions", () => {
    const annotated = withSubLessonStatuses(lessons, {
      visitedIds: ["s1", "s2", "s3"],
      completedIds: ["s1"],
      assignmentSubLessonIds: ["s2"],
    });

    expect(statuses(annotated)).toEqual([
      SUB_LESSON_STATUS.COMPLETED,
      SUB_LESSON_STATUS.PENDING_ASSIGNMENT,
      SUB_LESSON_STATUS.IN_PROGRESS,
    ]);
    expect(courseProgressPercent(annotated)).toBe(33);
  });

  it("leaves untouched sub-lessons at Default", () => {
    const annotated = withSubLessonStatuses(lessons, {});

    expect(statuses(annotated)).toEqual([
      SUB_LESSON_STATUS.NOT_STARTED,
      SUB_LESSON_STATUS.NOT_STARTED,
      SUB_LESSON_STATUS.NOT_STARTED,
    ]);
    expect(courseProgressPercent(annotated)).toBe(0);
  });

  it("reports Unknown rather than Default when progress did not load", () => {
    const annotated = withSubLessonStatuses(lessons, {
      completedIds: ["s1"],
      isReady: false,
    });

    expect(statuses(annotated)).toEqual([
      SUB_LESSON_STATUS.UNKNOWN,
      SUB_LESSON_STATUS.UNKNOWN,
      SUB_LESSON_STATUS.UNKNOWN,
    ]);
  });
});

describe("canCompleteSubLesson", () => {
  it("requires reaching the end of the content", () => {
    expect(canCompleteSubLesson({})).toBe(false);
    expect(
      canCompleteSubLesson({ hasVideo: true, videoPlayed: true }),
    ).toBe(false);
  });

  it("completes a text-only sub-lesson on the scroll gate alone", () => {
    expect(canCompleteSubLesson({ reachedEnd: true })).toBe(true);
  });

  it("requires the video to have been played", () => {
    expect(canCompleteSubLesson({ hasVideo: true, reachedEnd: true })).toBe(
      false,
    );
    expect(
      canCompleteSubLesson({
        hasVideo: true,
        videoPlayed: true,
        reachedEnd: true,
      }),
    ).toBe(true);
  });

  it("requires the assignment to have been submitted", () => {
    expect(
      canCompleteSubLesson({ hasAssignment: true, reachedEnd: true }),
    ).toBe(false);
    expect(
      canCompleteSubLesson({
        hasAssignment: true,
        assignmentSubmitted: true,
        reachedEnd: true,
      }),
    ).toBe(true);
  });

  it("requires video and assignment together when both are present", () => {
    const base = {
      hasVideo: true,
      hasAssignment: true,
      reachedEnd: true,
    };

    expect(canCompleteSubLesson({ ...base, videoPlayed: true })).toBe(false);
    expect(canCompleteSubLesson({ ...base, assignmentSubmitted: true })).toBe(
      false,
    );
    expect(
      canCompleteSubLesson({
        ...base,
        videoPlayed: true,
        assignmentSubmitted: true,
      }),
    ).toBe(true);
  });
});
