import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import {
  POST as addToWishlist,
  DELETE as deleteFromWishlist,
} from "@/app/api/wishlist/route";
import {
  formatLearningTime,
  getUserWishlist,
  isCourseWishlisted,
} from "@/lib/wishlist";
import { deletesFor } from "../helpers/mock-supabase.js";

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

async function deleteWishlist(options = {}) {
  const { searchParams, body } = options;
  const url = searchParams
    ? `http://localhost/api/wishlist?${searchParams}`
    : "http://localhost/api/wishlist";

  return deleteFromWishlist(
    new Request(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
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

  it("resolves course_code to course id when adding to wishlist", async () => {
    const supabase = createMockSupabase({
      courseSelect: { id: "resolved-uuid", course_code: "SD-101" },
    });
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await postWishlist({ courseId: "SD-101" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(insertsFor(supabase, "wishlists")[0].rows[0]).toEqual({
      user_id: USER.id,
      course_id: "resolved-uuid",
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

  it("returns 400 when user is already enrolled in the course", async () => {
    const supabase = createMockSupabase({
      courseId: COURSE_ID,
      courseSelect: { id: COURSE_ID },
      enrollmentsSelect: [
        { id: "enrollment-1", user_id: USER.id, course_id: COURSE_ID },
      ],
    });
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await postWishlist({ courseId: COURSE_ID });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/already own this course/i);
  });
});

describe("DELETE /api/wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a wishlist row for the signed-in user via query parameter", async () => {
    const supabase = createMockSupabase();
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await deleteWishlist({
      searchParams: `courseId=${COURSE_ID}`,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    const wishlistDeletes = deletesFor(supabase, "wishlists");
    expect(wishlistDeletes).toHaveLength(1);
    expect(wishlistDeletes[0].filters).toEqual(
      expect.arrayContaining([
        { column: "user_id", value: USER.id },
        { column: "course_id", value: COURSE_ID },
      ]),
    );
  });

  it("deletes a wishlist row for the signed-in user via request body", async () => {
    const supabase = createMockSupabase();
    requireUser.mockResolvedValue({
      supabase,
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await deleteWishlist({
      body: { courseId: COURSE_ID },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    const wishlistDeletes = deletesFor(supabase, "wishlists");
    expect(wishlistDeletes).toHaveLength(1);
    expect(wishlistDeletes[0].filters).toEqual(
      expect.arrayContaining([
        { column: "user_id", value: USER.id },
        { column: "course_id", value: COURSE_ID },
      ]),
    );
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

    const response = await deleteWishlist({
      searchParams: `courseId=${COURSE_ID}`,
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 when courseId is missing", async () => {
    requireUser.mockResolvedValue({
      supabase: createMockSupabase(),
      user: USER,
      profile: { id: USER.id },
      error: null,
    });

    const response = await deleteWishlist({});
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
          price: 3500,
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
      price: 3500,
      lessonCount: 3,
    });
  });

  it("filters out courses that user has already enrolled in and triggers cleanup", async () => {
    const mockWishlistRows = [
      {
        id: "wishlist-1",
        user_id: USER.id,
        course_id: "enrolled-course-id",
        created_at: "2026-08-01T00:00:00Z",
        courses: {
          id: "enrolled-course-id",
          title: "Service Design Essentials",
          course_code: "SD-101",
          summary: "Learn essential service design.",
          price: 3500,
          lessons: [],
        },
      },
      {
        id: "wishlist-2",
        user_id: USER.id,
        course_id: "other-course-id",
        created_at: "2026-08-01T00:00:00Z",
        courses: {
          id: "other-course-id",
          title: "UX Design Mastery",
          course_code: "UX-201",
          summary: "Master UX.",
          price: 4500,
          lessons: [],
        },
      },
    ];

    const supabase = createMockSupabase({
      wishlistsSelect: mockWishlistRows,
      enrollmentsSelect: [{ id: "enrollment-1", user_id: USER.id, course_id: "enrolled-course-id" }],
    });

    const result = await getUserWishlist(supabase, USER.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("other-course-id");

    const wishlistDeletes = deletesFor(supabase, "wishlists");
    expect(wishlistDeletes).toHaveLength(1);
    expect(wishlistDeletes[0].filters).toEqual([
      { column: "user_id", value: USER.id },
      { column: "course_id", value: "enrolled-course-id" },
    ]);
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

describe("getOtherInterestingCourses", () => {
  it("returns other interesting courses excluding current course", async () => {
    const { getOtherInterestingCourses } = await import("@/lib/courses");
    const mockCourses = [
      {
        id: "course-2",
        course_code: "UX-201",
        title: "UX Design Mastery",
        summary: "Master UX design fundamentals.",
        cover_image_url: "/courses/service-design.svg",
        total_learning_time: "8",
        price: 4500,
        is_active: true,
        tag_id: "tag-development",
        lessons: [{ count: 5 }],
      },
    ];

    const supabase = createMockSupabase({
      courseSelect: mockCourses,
    });

    const results = await getOtherInterestingCourses(supabase, {
      excludeCourseId: "course-1",
      limit: 3,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "course-2",
      courseCode: "UX-201",
      title: "UX Design Mastery",
      price: 4500,
    });
  });

  it("prefers same-tag courses then fills remaining slots", async () => {
    const { getOtherInterestingCourses } = await import("@/lib/courses");
    const mockCourses = [
      {
        id: "mkt-1",
        course_code: "MKT101",
        title: "Digital Marketing Fundamentals",
        summary: "Marketing basics",
        cover_image_url: "/courses/service-design.svg",
        total_learning_time: "10",
        price: 4590,
        is_active: true,
        tag_id: "tag-marketing",
        created_at: "2026-01-03T00:00:00Z",
        lessons: [{ count: 3 }],
      },
      {
        id: "bus-1",
        course_code: "BUS101",
        title: "Business Strategy Essentials",
        summary: "Business basics",
        cover_image_url: "/courses/software-developer.svg",
        total_learning_time: "14",
        price: 5990,
        is_active: true,
        tag_id: "tag-business",
        created_at: "2026-01-02T00:00:00Z",
        lessons: [{ count: 3 }],
      },
      {
        id: "dev-1",
        course_code: "DEV101",
        title: "Service Design Essentials",
        summary: "Development basics",
        cover_image_url: "/courses/ux-ui-beginner.svg",
        total_learning_time: "12",
        price: 3559,
        is_active: true,
        tag_id: "tag-development",
        created_at: "2026-01-01T00:00:00Z",
        lessons: [{ count: 4 }],
      },
    ];

    const supabase = createMockSupabase({
      courseSelect: mockCourses,
    });

    const results = await getOtherInterestingCourses(supabase, {
      excludeCourseId: "mkt-current",
      tagId: "tag-marketing",
      limit: 3,
    });

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      id: "mkt-1",
      courseCode: "MKT101",
    });
    expect(results.slice(1).map((course) => course.id).sort()).toEqual([
      "bus-1",
      "dev-1",
    ]);
  });
});

describe("getUserWishlistCount and getUserWishlistCourseIds", () => {
  it("returns the exact count of wishlisted items", async () => {
    const { getUserWishlistCount, getUserWishlistCourseIds } = await import(
      "@/lib/wishlist"
    );

    const mockWishlists = [
      { id: "w-1", user_id: USER.id, course_id: "course-1" },
      { id: "w-2", user_id: USER.id, course_id: "course-2" },
    ];

    const supabase = createMockSupabase({
      wishlistsSelect: mockWishlists,
    });

    const count = await getUserWishlistCount(supabase, USER.id);
    expect(count).toBe(2);

    const ids = await getUserWishlistCourseIds(supabase, USER.id);
    expect(ids).toEqual(["course-1", "course-2"]);
  });

  it("excludes enrolled courses from count and ids", async () => {
    const { getUserWishlistCount, getUserWishlistCourseIds } = await import(
      "@/lib/wishlist"
    );

    const mockWishlists = [
      { id: "w-1", user_id: USER.id, course_id: "course-1" },
      { id: "w-2", user_id: USER.id, course_id: "course-2" },
    ];

    const supabase = createMockSupabase({
      wishlistsSelect: mockWishlists,
      enrollmentsSelect: [{ id: "e-1", user_id: USER.id, course_id: "course-1" }],
    });

    const count = await getUserWishlistCount(supabase, USER.id);
    expect(count).toBe(1);

    const ids = await getUserWishlistCourseIds(supabase, USER.id);
    expect(ids).toEqual(["course-2"]);
  });

  it("returns 0 and empty array when supabase or userId is missing", async () => {
    const { getUserWishlistCount, getUserWishlistCourseIds } = await import(
      "@/lib/wishlist"
    );

    expect(await getUserWishlistCount(null, USER.id)).toBe(0);
    expect(await getUserWishlistCount(createMockSupabase(), null)).toBe(0);
    expect(await getUserWishlistCourseIds(null, USER.id)).toEqual([]);
    expect(await getUserWishlistCourseIds(createMockSupabase(), null)).toEqual(
      [],
    );
  });
});
