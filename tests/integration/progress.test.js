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
  checkCompletionAllowed,
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

function enrolledSupabase(overrides = {}) {
  return createMockSupabase({
    enrollmentsSelect: {
      id: "enroll-1",
      user_id: USER.id,
      course_id: COURSE_ID,
    },
    subLessonsSelect: { id: SUB_LESSON_ID, course_id: COURSE_ID },
    progressSelect: [],
    ...overrides,
  });
}

describe("getCourseProgress", () => {
  it("maps visited, completed, played, and submitted assignment ids", async () => {
    const supabase = createMockSupabase({
      progressSelect: [
        {
          sub_lesson_id: "s1",
          visited_at: "2026-01-01T00:00:00.000Z",
          completed_at: "2026-01-01T00:00:00.000Z",
          assignment_submitted_at: null,
          video_played_at: "2026-01-01T00:00:00.000Z",
        },
        {
          sub_lesson_id: "s2",
          visited_at: "2026-01-02T00:00:00.000Z",
          completed_at: null,
          assignment_submitted_at: "2026-01-02T00:00:00.000Z",
          video_played_at: null,
        },
      ],
    });

    await expect(
      getCourseProgress(supabase, USER.id, COURSE_ID),
    ).resolves.toEqual({
      visitedIds: ["s1", "s2"],
      completedIds: ["s1"],
      submittedAssignmentIds: ["s2"],
      videoPlayedIds: ["s1"],
      loaded: true,
    });
  });

  it("returns empty lists when user or course is missing", async () => {
    await expect(getCourseProgress({}, "", COURSE_ID)).resolves.toEqual({
      visitedIds: [],
      completedIds: [],
      submittedAssignmentIds: [],
      videoPlayedIds: [],
      loaded: true,
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
      videoPlayedIds: [],
      loaded: true,
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

  it("stamps video_played_at without completing the sub-lesson", async () => {
    const supabase = createMockSupabase({
      progressSelect: [
        {
          id: "progress-1",
          sub_lesson_id: SUB_LESSON_ID,
          completed_at: null,
          assignment_submitted_at: null,
          video_played_at: null,
        },
      ],
    });

    await recordSubLessonProgress(supabase, {
      userId: USER.id,
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "play_video",
    });

    const { payload } = updatesFor(supabase, "sub_lesson_progress")[0];
    expect(payload.video_played_at).toEqual(expect.any(String));
    expect(payload.completed_at).toBeUndefined();
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

  it("keeps the original completed_at when completing twice", async () => {
    const supabase = createMockSupabase({
      progressSelect: [
        {
          id: "progress-1",
          sub_lesson_id: SUB_LESSON_ID,
          completed_at: "2026-01-01T00:00:00.000Z",
          assignment_submitted_at: null,
        },
      ],
    });

    await recordSubLessonProgress(supabase, {
      userId: USER.id,
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "complete",
    });

    expect(
      updatesFor(supabase, "sub_lesson_progress")[0].payload.completed_at,
    ).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("POST /api/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves visit progress for an enrolled user", async () => {
    const supabase = enrolledSupabase();
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

  it("saves a play_video action without completing", async () => {
    const supabase = enrolledSupabase();
    mockAuthedUser(supabase);

    const response = await postProgress({
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "play_video",
    });

    expect(response.status).toBe(201);
    const row = insertsFor(supabase, "sub_lesson_progress")[0].rows[0];
    expect(row.video_played_at).toEqual(expect.any(String));
    expect(row.completed_at).toBeNull();
  });

  it("refuses to complete a sub-lesson with an unsubmitted assignment", async () => {
    const supabase = enrolledSupabase({
      assignmentsSelect: [{ id: "a1", sub_lesson_id: SUB_LESSON_ID }],
      submissionsSelect: [],
    });
    mockAuthedUser(supabase);

    const response = await postProgress({
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "complete",
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/submit the assignment/i);
    expect(insertsFor(supabase, "sub_lesson_progress")).toHaveLength(0);
    expect(updatesFor(supabase, "sub_lesson_progress")).toHaveLength(0);
  });

  it("completes a sub-lesson once its assignment is submitted", async () => {
    const supabase = enrolledSupabase({
      assignmentsSelect: [{ id: "a1", sub_lesson_id: SUB_LESSON_ID }],
      submissionsSelect: [
        {
          assignment_id: "a1",
          status: "submitted",
          submitted_at: "2026-01-03T00:00:00.000Z",
        },
      ],
    });
    mockAuthedUser(supabase);

    const response = await postProgress({
      courseId: COURSE_ID,
      subLessonId: SUB_LESSON_ID,
      action: "complete",
    });

    expect(response.status).toBe(201);
    expect(
      insertsFor(supabase, "sub_lesson_progress")[0].rows[0].completed_at,
    ).toEqual(expect.any(String));
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

describe("checkCompletionAllowed", () => {
  it("allows a sub-lesson with no assignments", async () => {
    const supabase = createMockSupabase({ assignmentsSelect: [] });

    await expect(
      checkCompletionAllowed(supabase, {
        userId: USER.id,
        subLessonId: SUB_LESSON_ID,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("blocks while any assignment on the sub-lesson is unsubmitted", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: [
        { id: "a1", sub_lesson_id: SUB_LESSON_ID },
        { id: "a2", sub_lesson_id: SUB_LESSON_ID },
      ],
      submissionsSelect: [
        {
          assignment_id: "a1",
          status: "submitted",
          submitted_at: "2026-01-03T00:00:00.000Z",
        },
      ],
    });

    const result = await checkCompletionAllowed(supabase, {
      userId: USER.id,
      subLessonId: SUB_LESSON_ID,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
  });
});
