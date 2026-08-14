import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { POST as createLesson } from "@/app/api/admin/courses/[id]/lessons/route";
import {
  GET as getLesson,
  PUT as updateLesson,
  DELETE as deleteLesson,
} from "@/app/api/admin/courses/[id]/lessons/[lessonId]/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

describe("Lesson Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/courses/[id]/lessons", () => {
    it("creates a lesson with sub-lessons and materials", async () => {
      const supabase = createMockSupabase();

      requireAdmin.mockResolvedValue({
        supabase,
        user: ADMIN_USER,
        profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
        error: null,
      });

      const payload = {
        lessonName: "Introduction to Figma",
        subLessons: [
          {
            title: "Getting Started",
            videoUrl: "course-trailers/user/intro.mp4",
            videoName: "intro.mp4",
          },
          {
            title: "Tools Overview",
            videoUrl: null,
            videoName: "",
          },
        ],
      };

      const response = await createLesson(
        new Request("http://localhost/api/admin/courses/c-1/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({ id: "c-1" }) },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);

      const lessonInserts = insertsFor(supabase, "lessons");
      expect(lessonInserts.length).toBeGreaterThan(0);
      expect(lessonInserts[0].rows[0].title).toBe("Introduction to Figma");

      const subLessonInserts = insertsFor(supabase, "sub_lessons");
      expect(subLessonInserts.length).toBe(2);

      const materialInserts = insertsFor(supabase, "materials");
      expect(materialInserts.length).toBe(1);
    });

    it("rejects invalid payload when lesson name is missing", async () => {
      const supabase = createMockSupabase();

      requireAdmin.mockResolvedValue({
        supabase,
        user: ADMIN_USER,
        profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
        error: null,
      });

      const response = await createLesson(
        new Request("http://localhost/api/admin/courses/c-1/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonName: "",
            subLessons: [{ title: "Sub 1" }],
          }),
        }),
        { params: Promise.resolve({ id: "c-1" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Lesson name is required");
    });
  });

  describe("DELETE /api/admin/courses/[id]/lessons/[lessonId]", () => {
    it("deletes a lesson by id", async () => {
      const supabase = createMockSupabase();

      requireAdmin.mockResolvedValue({
        supabase,
        user: ADMIN_USER,
        profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
        error: null,
      });

      const response = await deleteLesson(
        new Request("http://localhost/api/admin/courses/c-1/lessons/l-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "c-1", lessonId: "l-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});
