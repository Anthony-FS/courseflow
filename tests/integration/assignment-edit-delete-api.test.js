import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockSupabase,
  deletesFor,
  updatesFor,
} from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import {
  DELETE as deleteAssignment,
  GET as getAssignment,
  PATCH as updateAssignment,
} from "@/app/api/admin/assignments/[id]/route";

const ADMIN_USER = {
  id: "11111111-1111-1111-1111-111111111111",
};

function mockAdmin(supabase) {
  requireAdmin.mockResolvedValue({
    supabase,
    user: ADMIN_USER,
    profile: {
      id: ADMIN_USER.id,
      role: "admin",
      is_active: true,
    },
    error: null,
  });
}

function assignmentParams(id = "assignment-1") {
  return {
    params: Promise.resolve({ id }),
  };
}

function patchRequest(payload) {
  return new Request(
    "http://localhost/api/admin/assignments/assignment-1",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

function createStatusUpdateMock({ data, error = null } = {}) {
  const updates = [];
  return {
    updates,
    from(table) {
      return {
        update(payload) {
          const entry = { table, payload, id: null, columns: "" };
          updates.push(entry);
          const chain = {
            eq(_column, value) {
              entry.id = value;
              return chain;
            },
            select(columns) {
              entry.columns = columns;
              return chain;
            },
            maybeSingle: async () => ({ data: error ? null : data, error }),
          };
          return chain;
        },
      };
    },
  };
}

describe("Admin Assignment Edit/Delete API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/assignments/[id]", () => {
    it("returns assignment data for the edit form", async () => {
      const supabase = createMockSupabase({
        assignmentsSelect: [
          {
            id: "assignment-1",
            course_id: "course-1",
            sub_lesson_id: "sub-1",
            title: "JavaScript Variables Exercise",
            description: "Complete the variables exercise.",
            submission_type: "file",
            allowed_file_types: ["pdf", "doc"],
            max_file_size_mb: 10,
            subLesson: {
              lesson_id: "lesson-1",
            },
          },
        ],
      });

      mockAdmin(supabase);

      const response = await getAssignment(
        new Request(
          "http://localhost/api/admin/assignments/assignment-1",
        ),
        assignmentParams(),
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.assignment).toEqual({
        id: "assignment-1",
        courseId: "course-1",
        lessonId: "lesson-1",
        subLessonId: "sub-1",
        title: "JavaScript Variables Exercise",
        description: "Complete the variables exercise.",
        submissionType: "file",
        allowedFileTypes: ["pdf", "doc"],
        maxFileSizeMb: 10,
        answerText: "",
        choiceA: "",
        choiceB: "",
        choiceC: "",
        choiceD: "",
        correctChoice: "",
      });
    });

    it("returns 4-choice answer fields for the edit form", async () => {
      const supabase = createMockSupabase({
        assignmentsSelect: [
          {
            id: "assignment-1",
            course_id: "course-1",
            sub_lesson_id: "sub-1",
            title: "Pick the keyword",
            description: "",
            submission_type: "choice",
            allowed_file_types: null,
            max_file_size_mb: null,
            answer_text: null,
            choice_a: "var",
            choice_b: "let",
            choice_c: "const",
            choice_d: "function",
            correct_choice: "C",
            subLesson: {
              lesson_id: "lesson-1",
            },
          },
        ],
      });

      mockAdmin(supabase);

      const response = await getAssignment(
        new Request(
          "http://localhost/api/admin/assignments/assignment-1",
        ),
        assignmentParams(),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignment).toMatchObject({
        submissionType: "choice",
        answerText: "",
        choiceA: "var",
        choiceB: "let",
        choiceC: "const",
        choiceD: "function",
        correctChoice: "C",
      });
    });

    it("returns 404 when the assignment does not exist", async () => {
      const supabase = createMockSupabase({
        assignmentsSelect: [],
      });

      mockAdmin(supabase);

      const response = await getAssignment(
        new Request(
          "http://localhost/api/admin/assignments/missing",
        ),
        assignmentParams("missing"),
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe("Assignment not found");
    });
  });

  describe("PATCH /api/admin/assignments/[id]", () => {
    it.each([
      [true, false],
      [false, true],
    ])("updates assignment status from %s to %s", async (_current, nextActive) => {
      const updatedAt = "2026-09-03T10:45:00Z";
      const supabase = createStatusUpdateMock({
        data: {
          id: "assignment-1",
          is_active: nextActive,
          updated_at: updatedAt,
        },
      });
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({ isActive: nextActive }),
        assignmentParams(),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        id: "assignment-1",
        is_active: nextActive,
        updated_at: updatedAt,
        success: true,
      });
      expect(supabase.updates[0]).toMatchObject({
        table: "assignments",
        payload: { is_active: nextActive },
        id: "assignment-1",
      });
    });

    it("rejects a non-boolean assignment status", async () => {
      const supabase = createStatusUpdateMock();
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({ isActive: "false" }),
        assignmentParams(),
      );

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("isActive must be a boolean.");
      expect(supabase.updates).toHaveLength(0);
    });

    it("blocks assignment status updates when admin authorization fails", async () => {
      requireAdmin.mockResolvedValue({
        error: Response.json({ error: "Forbidden" }, { status: 403 }),
      });

      const response = await updateAssignment(
        patchRequest({ isActive: false }),
        assignmentParams(),
      );

      expect(response.status).toBe(403);
    });

    it("returns 404 when the assignment status target does not exist", async () => {
      const supabase = createStatusUpdateMock({ data: null });
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({ isActive: false }),
        assignmentParams("missing"),
      );

      expect(response.status).toBe(404);
      expect((await response.json()).error).toBe("Assignment not found");
    });

    it("returns 500 when the assignment status update fails", async () => {
      const supabase = createStatusUpdateMock({
        error: { message: "database unavailable" },
      });
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({ isActive: false }),
        assignmentParams(),
      );

      expect(response.status).toBe(500);
      expect((await response.json()).error).toBe("database unavailable");
    });

    it("updates an assignment by id", async () => {
      const supabase = createMockSupabase();
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({
          courseId: "course-1",
          lessonId: "lesson-1",
          subLessonId: "sub-1",
          title: "JavaScript Variables Practice",
          description: "Updated description",
          submissionType: "text",
          allowedFileTypes: ["pdf"],
          maxFileSizeMb: 20,
          answerText: "Updated answer",
        }),
        assignmentParams(),
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);

      const updates = updatesFor(supabase, "assignments");

      expect(updates).toHaveLength(1);
      expect(updates[0].payload).toMatchObject({
        course_id: "course-1",
        sub_lesson_id: "sub-1",
        title: "JavaScript Variables Practice",
        description: "Updated description",
        submission_type: "text",
        allowed_file_types: null,
        max_file_size_mb: null,
        answer_text: "Updated answer",
        choice_a: null,
        choice_b: null,
        choice_c: null,
        choice_d: null,
        correct_choice: null,
      });
      expect(updates[0].filters).toContainEqual({
        column: "id",
        value: "assignment-1",
      });
    });

    it("updates an assignment to 4-choice and stores options", async () => {
      const supabase = createMockSupabase();
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({
          courseId: "course-1",
          lessonId: "lesson-1",
          subLessonId: "sub-1",
          title: "Pick the keyword",
          description: "",
          submissionType: "choice",
          choiceA: "var",
          choiceB: "let",
          choiceC: "const",
          choiceD: "function",
          correctChoice: "B",
        }),
        assignmentParams(),
      );

      expect(response.status).toBe(200);
      const updates = updatesFor(supabase, "assignments");
      expect(updates[0].payload).toMatchObject({
        submission_type: "choice",
        answer_text: null,
        choice_a: "var",
        choice_b: "let",
        choice_c: "const",
        choice_d: "function",
        correct_choice: "B",
        allowed_file_types: null,
        max_file_size_mb: null,
      });
    });

    it("updates a 4-choice assignment to multiple correct letters", async () => {
      const supabase = createMockSupabase();
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({
          courseId: "course-1",
          lessonId: "lesson-1",
          subLessonId: "sub-1",
          title: "Pick the keywords",
          description: "",
          submissionType: "choice",
          choiceA: "var",
          choiceB: "let",
          choiceC: "const",
          choiceD: "function",
          correctChoice: "A,C",
        }),
        assignmentParams(),
      );

      expect(response.status).toBe(200);
      const updates = updatesFor(supabase, "assignments");
      expect(updates[0].payload).toMatchObject({
        submission_type: "choice",
        correct_choice: "A,C",
      });
    });

    it("rejects an update with a missing title", async () => {
      const supabase = createMockSupabase();
      mockAdmin(supabase);

      const response = await updateAssignment(
        patchRequest({
          courseId: "course-1",
          lessonId: "lesson-1",
          subLessonId: "sub-1",
          title: " ",
          submissionType: "text",
        }),
        assignmentParams(),
      );

      expect(response.status).toBe(400);
      expect(updatesFor(supabase, "assignments")).toHaveLength(0);

      const body = await response.json();
      expect(body.error).toContain("title");
    });
  });

  describe("DELETE /api/admin/assignments/[id]", () => {
    it("deletes an assignment by id", async () => {
      const supabase = createMockSupabase();
      mockAdmin(supabase);

      const response = await deleteAssignment(
        new Request(
          "http://localhost/api/admin/assignments/assignment-1",
          { method: "DELETE" },
        ),
        assignmentParams(),
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);

      const deletes = deletesFor(supabase, "assignments");

      expect(deletes).toHaveLength(1);
      expect(deletes[0].filters).toContainEqual({
        column: "id",
        value: "assignment-1",
      });
    });

    it("blocks the request when admin authorization fails", async () => {
      requireAdmin.mockResolvedValue({
        error: Response.json(
          { error: "Forbidden" },
          { status: 403 },
        ),
      });

      const response = await deleteAssignment(
        new Request(
          "http://localhost/api/admin/assignments/assignment-1",
          { method: "DELETE" },
        ),
        assignmentParams(),
      );

      expect(response.status).toBe(403);
    });
  });
});
