import { describe, expect, it, vi, beforeEach } from "vitest";

import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import { createMockSupabase, insertsFor, updatesFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { PUT as putSubmission } from "@/app/api/assignments/[id]/submission/route";

const USER = { id: "22222222-2222-2222-2222-222222222222" };
const ASSIGNMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COURSE_ID = "course-1";

const TEXT_ASSIGNMENT = {
  id: ASSIGNMENT_ID,
  course_id: COURSE_ID,
  submission_type: "text",
  answer_text: "People, processes, products, partners",
  correct_choice: null,
  allowed_file_types: null,
  max_file_size_mb: null,
};

function putBody(payload, id = ASSIGNMENT_ID) {
  return putSubmission(
    new Request(`http://localhost/api/assignments/${id}/submission`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function mockUser(supabase) {
  requireUser.mockResolvedValue({
    supabase,
    user: USER,
    profile: { id: USER.id },
    error: null,
  });
}

function enrolledMock(extra = {}) {
  return createMockSupabase({
    assignmentsSelect: TEXT_ASSIGNMENT,
    enrollmentsSelect: {
      id: "enr-1",
      user_id: USER.id,
      course_id: COURSE_ID,
    },
    ...extra,
  });
}

describe("PUT /api/assignments/[id]/submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a text submission and returns the answer key", async () => {
    const supabase = enrolledMock();
    mockUser(supabase);

    const response = await putBody({ content: "  my answer  " });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.content).toBe("my answer");
    expect(body.status).toBe("submitted");
    expect(body.submittedAt).toEqual(expect.any(String));
    expect(body.answerText).toBe("People, processes, products, partners");
    expect(body.correctChoice).toBeUndefined();

    expect(insertsFor(supabase, "submissions")[0].rows[0]).toMatchObject({
      assignment_id: ASSIGNMENT_ID,
      user_id: USER.id,
      content: "my answer",
      status: "submitted",
    });
  });

  it("rejects blank text without returning the answer key", async () => {
    const supabase = enrolledMock();
    mockUser(supabase);

    const response = await putBody({ content: "   " });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(EMPTY_FIELD_MESSAGE);
    expect(body.answerText).toBeUndefined();
    expect(insertsFor(supabase, "submissions")).toHaveLength(0);
  });

  it("returns 400 for a null JSON body", async () => {
    const supabase = enrolledMock();
    mockUser(supabase);

    const response = await putBody(null);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(EMPTY_FIELD_MESSAGE);
    expect(insertsFor(supabase, "submissions")).toHaveLength(0);
  });

  it("updates an existing row on the second submit", async () => {
    const supabase = enrolledMock({
      submissionsSelect: {
        id: "sub-1",
        assignment_id: ASSIGNMENT_ID,
        user_id: USER.id,
        content: "old",
        status: "submitted",
      },
    });
    mockUser(supabase);

    const response = await putBody({ content: "new answer" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.content).toBe("new answer");
    expect(body.submittedAt).toEqual(expect.any(String));
    expect(insertsFor(supabase, "submissions")).toHaveLength(0);
    expect(updatesFor(supabase, "submissions")[0].payload).toMatchObject({
      content: "new answer",
      status: "submitted",
      submitted_at: body.submittedAt,
    });
  });

  it("recovers from a unique violation by updating the concurrent row", async () => {
    const supabase = enrolledMock({
      submissionsSelect: [],
      insertErrors: { submissions: { code: "23505" } },
    });
    mockUser(supabase);

    const response = await putBody({ content: "raced answer" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.content).toBe("raced answer");
    expect(body.submittedAt).toEqual(expect.any(String));
    expect(insertsFor(supabase, "submissions")).toHaveLength(1);
    expect(updatesFor(supabase, "submissions")[0].payload).toMatchObject({
      content: "raced answer",
      status: "submitted",
      submitted_at: body.submittedAt,
    });
  });

  it("returns 404 when the assignment is missing", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: [],
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await putBody({ content: "hello" });
    expect(response.status).toBe(404);
  });

  it("returns 403 when the student is not enrolled", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: TEXT_ASSIGNMENT,
      enrollmentsSelect: [],
    });
    mockUser(supabase);

    const response = await putBody({ content: "hello" });
    expect(response.status).toBe(403);
  });

  it("returns correctChoice for a 4-choice assignment", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: {
        id: ASSIGNMENT_ID,
        course_id: COURSE_ID,
        submission_type: "choice",
        answer_text: null,
        correct_choice: "B",
        choice_a: "One",
        choice_b: "Two",
        choice_c: "Three",
        choice_d: "Four",
      },
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await putBody({ content: "A" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.correctChoice).toBe("B");
    expect(body.answerText).toBeUndefined();
  });

  it("returns a multi-letter correctChoice", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: {
        id: ASSIGNMENT_ID,
        course_id: COURSE_ID,
        submission_type: "choice",
        answer_text: null,
        correct_choice: "A,C",
        choice_a: "One",
        choice_b: "Two",
        choice_c: "Three",
        choice_d: "Four",
      },
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await putBody({ content: "A,C" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.correctChoice).toBe("A,C");
    expect(body.content).toBe("A,C");
  });
});
