import { describe, expect, it } from "vitest";

import {
  MEMBER_ASSIGNMENT_COLUMNS,
  getMemberAssignments,
} from "@/lib/member-assignments";

function createMemberAssignmentMock({
  enrollments = [],
  assignments = [],
  submissions = [],
  errors = {},
} = {}) {
  const queries = [];
  const rows = { enrollments, assignments, submissions };

  return {
    queries,
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);

      const result = () => ({
        data: errors[table] ? null : rows[table],
        error: errors[table] ?? null,
      });
      const chain = {
        select(columns) {
          query.columns = columns;
          return chain;
        },
        eq(column, value) {
          query.filters.push({ type: "eq", column, value });
          return chain;
        },
        in(column, value) {
          query.filters.push({ type: "in", column, value });
          return chain;
        },
        order(column, options) {
          query.order = { column, options };
          return Promise.resolve(result());
        },
        then(onFulfilled, onRejected) {
          return Promise.resolve(result()).then(onFulfilled, onRejected);
        },
      };

      return chain;
    },
  };
}

function enrolledAssignment() {
  return {
    id: "assignment-1",
    course_id: "course-1",
    sub_lesson_id: "sub-1",
    title: "Research reflection",
    course: {
      id: "course-1",
      title: "Service Design",
      course_code: "svc-101",
    },
    subLesson: {
      id: "sub-1",
      title: "Interviews",
      lesson: { id: "lesson-1", title: "Research" },
    },
  };
}

describe("getMemberAssignments", () => {
  it("filters by the signed-in member's enrolled course IDs", async () => {
    const supabase = createMemberAssignmentMock({
      enrollments: [{ course_id: "course-1" }],
      assignments: [
        enrolledAssignment(),
        {
          ...enrolledAssignment(),
          id: "assignment-hidden",
          course_id: "course-2",
        },
      ],
    });

    const result = await getMemberAssignments(supabase, "member-1");
    const assignmentQuery = supabase.queries.find(
      (query) => query.table === "assignments",
    );

    expect(assignmentQuery.filters).toContainEqual({
      type: "in",
      column: "course_id",
      value: ["course-1"],
    });
    expect(result.assignments.map((assignment) => assignment.id)).toEqual([
      "assignment-1",
    ]);
  });

  it("selects no answer-key fields and scopes submissions to the member", async () => {
    const supabase = createMemberAssignmentMock({
      enrollments: [{ course_id: "course-1" }],
      assignments: [enrolledAssignment()],
      submissions: [
        {
          assignment_id: "assignment-1",
          status: "submitted",
          submitted_at: "2026-09-01T00:00:00Z",
        },
      ],
    });

    const result = await getMemberAssignments(supabase, "member-1");
    const submissionQuery = supabase.queries.find(
      (query) => query.table === "submissions",
    );

    expect(MEMBER_ASSIGNMENT_COLUMNS).not.toMatch(/answer_text|correct_choice/);
    expect(submissionQuery.columns).toBe(
      "assignment_id, status, submitted_at",
    );
    expect(submissionQuery.filters).toContainEqual({
      type: "eq",
      column: "user_id",
      value: "member-1",
    });
    expect(result.assignments[0].status).toBe("submitted");
  });

  it("returns a distinct no-enrollment result without querying assignments", async () => {
    const supabase = createMemberAssignmentMock();

    const result = await getMemberAssignments(supabase, "member-1");

    expect(result).toEqual({ enrollmentCount: 0, assignments: [] });
    expect(supabase.queries.map((query) => query.table)).toEqual([
      "enrollments",
    ]);
  });

  it("returns an empty assignment list for enrolled courses without assignments", async () => {
    const supabase = createMemberAssignmentMock({
      enrollments: [{ course_id: "course-1" }],
    });

    const result = await getMemberAssignments(supabase, "member-1");

    expect(result).toEqual({ enrollmentCount: 1, assignments: [] });
  });

  it("surfaces unexpected query errors", async () => {
    const supabase = createMemberAssignmentMock({
      errors: { enrollments: { message: "database unavailable" } },
    });

    await expect(
      getMemberAssignments(supabase, "member-1"),
    ).rejects.toThrow("database unavailable");
  });
});
