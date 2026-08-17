import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { POST as createAssignment } from "@/app/api/admin/assignments/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

function postAssignment(payload) {
  return createAssignment(
    new Request("http://localhost/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

function mockAdmin(supabase) {
  requireAdmin.mockResolvedValue({
    supabase,
    user: ADMIN_USER,
    profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
    error: null,
  });
}

describe("POST /api/admin/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a text assignment attached to a sub-lesson", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Week 1 homework",
      description: "Write a summary",
      submissionType: "text",
      allowedFileTypes: ["pdf"],
      maxFileSizeMb: 20,
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);

    const assignmentInserts = insertsFor(supabase, "assignments");
    expect(assignmentInserts).toHaveLength(1);
    expect(assignmentInserts[0].rows[0]).toMatchObject({
      course_id: "course-1",
      sub_lesson_id: "sub-1",
      title: "Week 1 homework",
      description: "Write a summary",
      submission_type: "text",
      allowed_file_types: null,
      max_file_size_mb: null,
    });
  });

  it("creates a file assignment with allowed types and max size", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Upload your brief",
      description: "",
      submissionType: "file",
      allowedFileTypes: ["pdf", "doc"],
      maxFileSizeMb: 10,
    });

    expect(response.status).toBe(201);

    const assignmentInserts = insertsFor(supabase, "assignments");
    expect(assignmentInserts[0].rows[0]).toMatchObject({
      submission_type: "file",
      allowed_file_types: ["pdf", "doc"],
      max_file_size_mb: 10,
    });
  });

  it("rejects a missing title", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "  ",
      submissionType: "text",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("title");
    expect(insertsFor(supabase, "assignments")).toHaveLength(0);
  });

  it("rejects file upload without an allowed type", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Upload your brief",
      submissionType: "file",
      allowedFileTypes: [],
      maxFileSizeMb: 20,
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.toLowerCase()).toContain("allowed");
    expect(insertsFor(supabase, "assignments")).toHaveLength(0);
  });
});
