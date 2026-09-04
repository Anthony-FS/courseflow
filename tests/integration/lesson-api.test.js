import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabase, insertsFor, updatesFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { POST as createLesson } from "@/app/api/admin/courses/[id]/lessons/route";
import {
  GET as getLessonDetail,
  PUT as updateLesson,
  DELETE as deleteLesson,
} from "@/app/api/admin/courses/[id]/lessons/[lessonId]/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

describe("Lesson Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/courses/[id]/lessons", () => {
    it("creates a lesson with sub-lessons, descriptions, preview toggle, and attachments", async () => {
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
            description: "Learn the basics of Figma interface and tools.",
            videoUrl: "course-trailers/user/intro.mp4",
            videoName: "intro.mp4",
            attachmentUrl: "course-attachments/user/notes.pdf",
            attachmentName: "notes.pdf",
            attachmentType: "application/pdf",
          },
          {
            title: "Tools Overview",
            description: "Deep dive into vector networks and components.",
            videoUrl: null,
            videoName: "",
            attachmentUrl: null,
            attachmentName: "",
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
      expect(subLessonInserts[0].rows[0].description).toBe(
        "Learn the basics of Figma interface and tools.",
      );
      expect(subLessonInserts[0].rows[0]).not.toHaveProperty("is_preview");

      const materialInserts = insertsFor(supabase, "materials");
      expect(materialInserts.length).toBe(2); // 1 video + 1 attachment
      expect(materialInserts[0].rows[0].file_type).toBe("video/mp4");
      expect(materialInserts[1].rows[0].file_type).toBe("application/pdf");

      const courseTouch = updatesFor(supabase, "courses").find((entry) =>
        Object.prototype.hasOwnProperty.call(entry.payload, "updated_at"),
      );
      expect(courseTouch).toBeTruthy();
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

  describe("PUT /api/admin/courses/[id]/lessons/[lessonId]", () => {
    it("updates a lesson and recreates sub-lessons with attachments", async () => {
      const supabase = createMockSupabase();

      requireAdmin.mockResolvedValue({
        supabase,
        user: ADMIN_USER,
        profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
        error: null,
      });

      const payload = {
        lessonName: "Advanced Figma Techniques",
        subLessons: [
          {
            title: "Auto Layout Masterclass",
            description: "Advanced nested auto-layouts.",
            videoUrl: "course-trailers/user/autolayout.mp4",
            videoName: "autolayout.mp4",
            attachmentUrl: "course-attachments/user/cheatsheet.pdf",
            attachmentName: "cheatsheet.pdf",
          },
        ],
      };

      const response = await updateLesson(
        new Request("http://localhost/api/admin/courses/c-1/lessons/l-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({ id: "c-1", lessonId: "l-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      const subLessonInserts = insertsFor(supabase, "sub_lessons");
      expect(subLessonInserts.length).toBe(1);
      expect(subLessonInserts[0].rows[0].title).toBe("Auto Layout Masterclass");
      expect(subLessonInserts[0].rows[0].description).toBe(
        "Advanced nested auto-layouts.",
      );

      const materialInserts = insertsFor(supabase, "materials");
      expect(materialInserts.length).toBe(2); // 1 video + 1 attachment
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

  describe("GET /api/admin/courses/[id]/lessons/[lessonId]", () => {
    it("returns lesson detail with sub-lessons and materials", async () => {
      const supabase = createMockSupabase({
        lessonsSelect: [
          {
            id: "l-1",
            title: "Lesson 1",
            sort_order: 0,
            sub_lessons: [
              {
                id: "sub-1",
                title: "Sub 1",
                description: "Sub 1 desc",
                sort_order: 1,
                materials: [
                  {
                    id: "m-1",
                    name: "video.mp4",
                    file_url: "course-trailers/user/video.mp4",
                    file_type: "video/mp4",
                  },
                ],
              },
            ],
          },
        ],
      });

      requireAdmin.mockResolvedValue({
        supabase,
        user: ADMIN_USER,
        profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
        error: null,
      });

      const response = await getLessonDetail(
        new Request("http://localhost/api/admin/courses/c-1/lessons/l-1"),
        { params: Promise.resolve({ id: "c-1", lessonId: "l-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.lesson).toBeTruthy();
      expect(body.lesson.name).toBe("Lesson 1");
      expect(body.lesson.subLessons).toHaveLength(1);
      expect(body.lesson.subLessons[0].title).toBe("Sub 1");
      expect(body.lesson.subLessons[0].description).toBe("Sub 1 desc");
      expect(body.lesson.subLessons[0].videoUrl).toBe(
        "course-trailers/user/video.mp4",
      );
    });
  });
});
