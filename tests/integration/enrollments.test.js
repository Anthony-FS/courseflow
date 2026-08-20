import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { POST as enroll } from "@/app/api/enrollments/route";

const USER = { id: "22222222-2222-2222-2222-222222222222" };
const COURSE_ID = "course-1";

async function postEnrollment(body) {
  return enroll(
    new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts an enrollment row for the signed-in user", async () => {
    const supabase = createMockSupabase({
      courseId: COURSE_ID,
      courseSelect: { id: COURSE_ID },
    });
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await postEnrollment({ courseId: COURSE_ID });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(insertsFor(supabase, "enrollments")[0].rows[0]).toEqual({
      user_id: USER.id,
      course_id: COURSE_ID,
    });
  });

  it("returns 400 when courseId is missing", async () => {
    requireUser.mockResolvedValue({
      supabase: createMockSupabase({ courseSelect: { id: COURSE_ID } }),
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await postEnrollment({});
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/course id is required/i);
  });
});
