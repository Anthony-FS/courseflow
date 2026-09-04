import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";
import { jsonError } from "@/lib/api";
import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

import { requireAdmin } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
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
    checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
  });

  it("returns 401 without rate limiting when the caller is not an admin", async () => {
    const from = vi.fn();
    requireAdmin.mockResolvedValue({
      supabase: { from },
      user: null,
      error: jsonError("Unauthorized", 401),
    });

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Week 1 homework",
      submissionType: "text",
      answerText: "A summary",
    });

    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 429 without inserting when the create limit is exceeded", async () => {
    const from = vi.fn();
    mockAdmin({ from });
    checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 27 });

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Week 1 homework",
      submissionType: "text",
      answerText: "A summary",
    });
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("27");
    expect(body.error).toMatch(/too many assignment creates/i);
    expect(from).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      `admin-assignment-create:${ADMIN_USER.id}`,
      expect.objectContaining({ limit: 20, windowMs: 15 * 60_000 }),
    );
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
      answerText: "A one-paragraph summary",
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
      answer_text: "A one-paragraph summary",
      choice_a: null,
      choice_b: null,
      choice_c: null,
      choice_d: null,
      correct_choice: null,
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

  it("rejects a text assignment without an answer", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Week 1 homework",
      submissionType: "text",
      answerText: "  ",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(EMPTY_FIELD_MESSAGE);
    expect(insertsFor(supabase, "assignments")).toHaveLength(0);
  });

  it("creates a 4-choice assignment with options and a correct letter", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
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
      correctChoice: "C",
    });

    expect(response.status).toBe(201);

    const assignmentInserts = insertsFor(supabase, "assignments");
    expect(assignmentInserts[0].rows[0]).toMatchObject({
      submission_type: "choice",
      answer_text: null,
      choice_a: "var",
      choice_b: "let",
      choice_c: "const",
      choice_d: "function",
      correct_choice: "C",
      allowed_file_types: null,
      max_file_size_mb: null,
    });
  });

  it("creates a 4-choice assignment with multiple correct letters", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
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
    });

    expect(response.status).toBe(201);

    const assignmentInserts = insertsFor(supabase, "assignments");
    expect(assignmentInserts[0].rows[0]).toMatchObject({
      submission_type: "choice",
      correct_choice: "A,C",
    });
  });

  it("rejects a 4-choice assignment missing a correct letter", async () => {
    const supabase = createMockSupabase();
    mockAdmin(supabase);

    const response = await postAssignment({
      courseId: "course-1",
      lessonId: "lesson-1",
      subLessonId: "sub-1",
      title: "Pick the keyword",
      submissionType: "choice",
      choiceA: "var",
      choiceB: "let",
      choiceC: "const",
      choiceD: "function",
      correctChoice: "",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(EMPTY_FIELD_MESSAGE);
    expect(insertsFor(supabase, "assignments")).toHaveLength(0);
  });
});
