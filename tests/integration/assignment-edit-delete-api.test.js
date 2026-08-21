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
      });
      expect(updates[0].filters).toContainEqual({
        column: "id",
        value: "assignment-1",
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