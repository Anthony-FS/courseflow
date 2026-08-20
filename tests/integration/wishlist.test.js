import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase, insertsFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { POST as addToWishlist } from "@/app/api/wishlist/route";

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
