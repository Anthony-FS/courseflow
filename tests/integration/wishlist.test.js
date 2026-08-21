import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { POST as addToWishlist } from "@/app/api/wishlist/route";
import {
  formatLearningTime,
  getUserWishlist,
  isCourseWishlisted,
} from "@/lib/wishlist";

const USER = { id: "22222222-2222-2222-2222-222222222222" };
const COURSE_ID = "course-1";

async function postWishlist(body) {
  return addToWishlist(
    new Request("http://localhost/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a wishlist row for the signed-in user", async () => {
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

    const response = await postWishlist({ courseId: COURSE_ID });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(insertsFor(supabase, "wishlists")[0].rows[0]).toEqual({
      user_id: USER.id,
      course_id: COURSE_ID,
    });
  });

  it("returns 401 when the user is not signed in", async () => {
    requireUser.mockResolvedValue({
      supabase: createMockSupabase(),
      user: null,
      profile: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const response = await postWishlist({ courseId: COURSE_ID });
    expect(response.status).toBe(401);
  });

  it("returns 400 when courseId is missing", async () => {
    requireUser.mockResolvedValue({
      supabase: createMockSupabase({ courseSelect: { id: COURSE_ID } }),
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await postWishlist({});
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/course id is required/i);
  });
});

describe("getUserWishlist", () => {
  it("returns mapped wishlisted courses for the user", async () => {
    const mockWishlistRows = [
      {
        id: "wishlist-1",
        user_id: USER.id,
        course_id: COURSE_ID,
        created_at: "2026-08-01T00:00:00Z",
        courses: {
          id: COURSE_ID,
          title: "Service Design Essentials",
          course_code: "SD-101",
          summary: "Learn essential service design.",
          description: "Full description here",
          total_learning_time: "6",
          cover_image_url: "/courses/service-design.svg",
          cover_file_url: null,
          lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3" }],
        },
      },
    ];

    const supabase = createMockSupabase({
      wishlistsSelect: mockWishlistRows,
    });

    const result = await getUserWishlist(supabase, USER.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      wishlistId: "wishlist-1",
      id: COURSE_ID,
      code: "SD-101",
      title: "Service Design Essentials",
      summary: "Learn essential service design.",
      lessonCount: 3,
    });
  });

  it("returns empty array if user has no wishlisted courses", async () => {
    const supabase = createMockSupabase({
      wishlistsSelect: [],
    });

    const result = await getUserWishlist(supabase, USER.id);
    expect(result).toEqual([]);
  });

  it("returns empty array if supabase or userId is missing", async () => {
    expect(await getUserWishlist(null, USER.id)).toEqual([]);
    expect(await getUserWishlist(createMockSupabase(), null)).toEqual([]);
  });
});

describe("formatLearningTime", () => {
  it("formats number and string hours properly", () => {
    expect(formatLearningTime("6")).toBe("6 Hours");
    expect(formatLearningTime("1")).toBe("1 Hour");
    expect(formatLearningTime("6 Hours")).toBe("6 Hours");
    expect(formatLearningTime(null)).toBe("6 Hours");
  });
});

describe("isCourseWishlisted", () => {
  it("returns true if wishlist entry exists", async () => {
    const supabase = createMockSupabase({
      wishlistsSelect: [{ id: "w-1", user_id: USER.id, course_id: COURSE_ID }],
    });
    const exists = await isCourseWishlisted(supabase, USER.id, COURSE_ID);
    expect(exists).toBe(true);
  });

  it("returns false if wishlist entry does not exist", async () => {
    const supabase = createMockSupabase({
      wishlistsSelect: [],
    });
    const exists = await isCourseWishlisted(supabase, USER.id, COURSE_ID);
    expect(exists).toBe(false);
  });

  it("returns false if userId or courseId is missing", async () => {
    const supabase = createMockSupabase();
    expect(await isCourseWishlisted(supabase, null, COURSE_ID)).toBe(false);
    expect(await isCourseWishlisted(supabase, USER.id, null)).toBe(false);
  });
});
