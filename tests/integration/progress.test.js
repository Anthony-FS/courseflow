import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createMockSupabase,
  insertsFor,
  updatesFor,
} from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { POST as saveProgress } from "@/app/api/progress/route";
import {
  getCourseProgress,
  recordSubLessonProgress,
} from "@/lib/course-learn-progress";

const USER = { id: "22222222-2222-2222-2222-222222222222" };
const COURSE_ID = "course-1";
const SUB_LESSON_ID = "sub-1";

async function postProgress(body) {
  return saveProgress(
    new Request("http://localhost/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function mockAuthedUser(supabase) {
  requireUser.mockResolvedValue({
    supabase,
    user: USER,
    profile: { id: USER.id },
    error: null,
  });
}

describe("getCourseProgress", () => {
  it("maps visited, completed, and submitted assignment ids", async () => {
    const supabase = createMockSupabase({
      progressSelect: [
        {
          sub_lesson_id: "s1",
          visited_at: "2026-01-01T00:00:00.000Z",
          completed_at: "2026-01-01T00:00:00.000Z",
          assignment_submitted_at: null,
        },
        {
          sub_lesson_id: "s2",
          visited_at: "2026-01-02T00:00:00.000Z",
          completed_at: null,
          assignment_submitted_at: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    await expect(
      getCourseProgress(supabase, USER.id, COURSE_ID),
    ).resolves.toEqual({
      visitedIds: ["s1", "s2"],
      completedIds: ["s1"],
      submittedAssignmentIds: ["s2"],
    });
  });

  it("returns empty lists when user or course is missing", async () => {
    await expect(getCourseProgress({}, "", COURSE_ID)).resolves.toEqual({
      visitedIds: [],
      completedIds: [],
      submittedAssignmentIds: [],
    });
  });

  it("merges submitted assignment ids from submissions table", async () => {
    const supabase = createMockSupabase({
      progressSelect: [
        {
          sub_lesson_id: "s1",
          visited_at: "2026-01-01T00:00:00.000Z",
          completed_at: null,
          assignment_submitted_at: null,
        },
      ],
      assignmentsSelect: [
        { id: "a1", sub_lesson_id: "s1" },
        { id: "a2", sub_lesson_id: "s3" },
      ],
      submissionsSelect: [
        {
          assignment_id: "a1",
          status: "submitted",
          submitted_at: "2026-01-03T00:00:00.000Z",
        },
      ],
    });

    await expect(
      getCourseProgress(supabase, USER.id, COURSE_ID),
    ).resolves.toEqual({
      visitedIds: ["s1"],
      completedIds: [],
      submittedAssignmentIds: ["s1"],
    });
  });
});

describe("recordSubLessonProgress", () => {
  it("inserts a visit row when none exists", async () => {
    const supabase = createMockSupabase({ progressSelect: [] });

    const result = await recordSubLessonProgress(supabase, {
      userId: USER.id,
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "visit",
    });

    expect(result.created).toBe(true);
    expect(insertsFor(supabase, "sub_lesson_progress")[0].rows[0]).toMatchObject({
      user_id: USER.id,
      course_id: COURSE_ID,
      sub_lesson_id: SUB_LESSON_ID,
    });
  });

  it("updates an existing row when completing", async () => {
    const supabase = createMockSupabase({
      progressSelect: [
        {
          id: "progress-1",
          sub_lesson_id: SUB_LESSON_ID,
          completed_at: null,
          assignment_submitted_at: null,
        },
      ],
    });

    const result = await recordSubLessonProgress(supabase, {
      userId: USER.id,
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "complete",
    });

    expect(result).toEqual({ id: "progress-1", created: false });
    expect(updatesFor(supabase, "sub_lesson_progress")[0].payload).toMatchObject({
      completed_at: expect.any(String),
    });
  });
});

describe("POST /api/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves visit progress for an enrolled user", async () => {
    const supabase = createMockSupabase({
      enrollmentsSelect: { id: "enroll-1", user_id: USER.id, course_id: COURSE_ID },
      subLessonsSelect: { id: SUB_LESSON_ID, course_id: COURSE_ID },
      progressSelect: [],
    });
    mockAuthedUser(supabase);

    const response = await postProgress({
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "visit",
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(insertsFor(supabase, "sub_lesson_progress")[0].rows[0]).toMatchObject({
      user_id: USER.id,
      course_id: COURSE_ID,
      sub_lesson_id: SUB_LESSON_ID,
    });
  });

  it("returns 403 when the user is not enrolled", async () => {
    const supabase = createMockSupabase({
      enrollmentsSelect: [],
      subLessonsSelect: { id: SUB_LESSON_ID, course_id: COURSE_ID },
    });
    mockAuthedUser(supabase);

    const response = await postProgress({
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "visit",
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/enrolled/i);
  });

  it("returns 400 when action is invalid", async () => {
    const supabase = createMockSupabase({
      enrollmentsSelect: { id: "enroll-1" },
    });
    mockAuthedUser(supabase);

    const response = await postProgress({
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "skip",
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid progress action/i);
  });
});
