import { describe, expect, it } from "vitest";

import { mapMemberAssignments } from "@/lib/member-assignments";

const ENROLLED_COURSE_ID = "course-1";

function assignmentRow(overrides = {}) {
  return {
    id: "assignment-1",
    course_id: ENROLLED_COURSE_ID,
    sub_lesson_id: "sub-1",
    title: "Map a customer journey",
    answer_text: "must not be returned",
    correct_choice: "A",
    course: {
      id: ENROLLED_COURSE_ID,
      title: "Service Design",
      course_code: "svc-101",
    },
    subLesson: {
      id: "sub-1",
      title: "Journey maps",
      lesson: { id: "lesson-1", title: "Research" },
    },
    ...overrides,
  };
}

describe("member assignment mapping", () => {
  it("excludes assignments from courses outside the member's enrollments", () => {
    const mapped = mapMemberAssignments(
      [
        assignmentRow(),
        assignmentRow({
          id: "assignment-2",
          course_id: "course-2",
          course: {
            id: "course-2",
            title: "Hidden course",
            course_code: "hidden",
          },
        }),
      ],
      [],
      [ENROLLED_COURSE_ID],
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe("assignment-1");
  });

  it("maps Submitted and Pending from only the signed-in user's supplied submissions", () => {
    const submitted = mapMemberAssignments(
      [assignmentRow()],
      [
        {
          assignment_id: "assignment-1",
          status: "submitted",
          submitted_at: "2026-09-01T00:00:00Z",
        },
      ],
      [ENROLLED_COURSE_ID],
    );
    const pending = mapMemberAssignments(
      [assignmentRow()],
      [],
      [ENROLLED_COURSE_ID],
    );

    expect(submitted[0].status).toBe("submitted");
    expect(pending[0].status).toBe("pending");
  });

  it("returns learner-safe fields and the existing course learn link", () => {
    const [mapped] = mapMemberAssignments(
      [assignmentRow()],
      [],
      [ENROLLED_COURSE_ID],
    );

    expect(mapped).toEqual({
      id: "assignment-1",
      title: "Map a customer journey",
      courseId: ENROLLED_COURSE_ID,
      courseTitle: "Service Design",
      lessonTitle: "Research",
      subLessonTitle: "Journey maps",
      status: "pending",
      href: "/courses/svc-101/learn?subLessonId=sub-1",
    });
    expect(mapped).not.toHaveProperty("answerText");
    expect(mapped).not.toHaveProperty("answer_text");
    expect(mapped).not.toHaveProperty("correctChoice");
    expect(mapped).not.toHaveProperty("correct_choice");
  });

  it("uses the assignment course_id when the course join is missing", () => {
    const [mapped] = mapMemberAssignments(
      [assignmentRow({ course: null })],
      [],
      [ENROLLED_COURSE_ID],
    );

    expect(mapped.courseId).toBe(ENROLLED_COURSE_ID);
    expect(mapped.courseTitle).toBe("-");
  });
});
