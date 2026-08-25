import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { GET as getEnrollments, POST as enroll } from "@/app/api/enrollments/route";

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

function createEnrollmentReadMock({ rows = [], error = null } = {}) {
  const queries = [];

  return {
    queries,
    from(table) {
      const query = { table, filters: [], order: null };
      queries.push(query);

      const chain = {
        select(columns) {
          query.columns = columns;
          return chain;
        },
        eq(column, value) {
          query.filters.push({ column, value });
          return chain;
        },
        order(column, options) {
          query.order = { column, options };
          return Promise.resolve({ data: error ? null : rows, error });
        },
      };

      return chain;
    },
  };
}

describe("GET /api/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the signed-in user's enrolled courses", async () => {
    const supabase = createEnrollmentReadMock({
      rows: [
        {
          id: "enrollment-1",
          user_id: USER.id,
          course_id: COURSE_ID,
          subscribed_at: "2026-08-01T00:00:00Z",
          courses: {
            id: COURSE_ID,
            title: "Service Design Essentials",
            course_code: "SD-101",
            summary: "Learn essential service design.",
            description: "Full description here",
            total_learning_time: "6",
            cover_image_url: "/courses/service-design.svg",
            cover_file_url: null,
            price: 3500,
            lessons: [{ id: "lesson-1" }, { id: "lesson-2" }],
          },
        },
      ],
    });
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await getEnrollments();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.courses).toHaveLength(1);
    expect(body.courses[0]).toMatchObject({
      enrollmentId: "enrollment-1",
      id: COURSE_ID,
      code: "SD-101",
      title: "Service Design Essentials",
      lessonCount: 2,
    });
  });

  it("queries enrollment records only for the authenticated user", async () => {
    const supabase = createEnrollmentReadMock();
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    await getEnrollments();

    expect(supabase.queries).toHaveLength(1);
    expect(supabase.queries[0].table).toBe("enrollments");
    expect(supabase.queries[0].filters).toEqual([
      { column: "user_id", value: USER.id },
    ]);
  });

  it("returns an empty list when the user has no enrolled courses", async () => {
    const supabase = createEnrollmentReadMock({ rows: [] });
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await getEnrollments();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ courses: [] });
  });

  it("rejects an unauthenticated request", async () => {
    requireUser.mockResolvedValue({
      supabase: createEnrollmentReadMock(),
      user: null,
      profile: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const response = await getEnrollments();

    expect(response.status).toBe(401);
  });

  it("returns 500 when the enrollment query fails", async () => {
    const supabase = createEnrollmentReadMock({
      error: { message: "Database unavailable" },
    });
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await getEnrollments();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database unavailable");
  });
});

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
