import { describe, expect, it } from "vitest";

import {
  flattenSubLessons,
  learnSubLessonHref,
  mockProgressPercent,
  resolveActiveSubLesson,
  withMockLessonStatuses,
} from "@/lib/course-learn";

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

describe("course-learn helpers", () => {
  it("flattens sub-lessons in course order", () => {
    expect(flattenSubLessons(lessons).map((item) => item.id)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
  });

  it("resolves active, previous, and next sub-lessons", () => {
    const flat = flattenSubLessons(lessons);
    const result = resolveActiveSubLesson(flat, "s2");

    expect(result.active.id).toBe("s2");
    expect(result.prev.id).toBe("s1");
    expect(result.next.id).toBe("s3");
  });

  it("defaults to the first sub-lesson when id is missing", () => {
    const flat = flattenSubLessons(lessons);
    const result = resolveActiveSubLesson(flat, undefined);

    expect(result.active.id).toBe("s1");
    expect(result.prev).toBeNull();
  });

  it("mocks statuses relative to the active sub-lesson", () => {
    const withStatus = withMockLessonStatuses(lessons, "s2");

    expect(withStatus[0].subLessons[0].status).toBe("completed");
    expect(withStatus[0].subLessons[1].status).toBe("in-progress");
    expect(withStatus[1].subLessons[0].status).toBe("not-started");
    expect(mockProgressPercent(withStatus)).toBe(33);
  });

  it("builds learn href with encoded query", () => {
    expect(learnSubLessonHref("svc-101", "abc/def")).toBe(
      "/courses/svc-101/learn?subLessonId=abc%2Fdef",
    );
  });
});
