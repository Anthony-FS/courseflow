import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { GET as getCourseLessons } from "@/app/api/admin/courses/[id]/lessons/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

describe("GET /api/admin/courses/[id]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns lessons ordered from the database with sub-lesson counts", async () => {
    const supabase = createMockSupabase({
      lessonsSelect: [
        {
          id: "lesson-1",
          title: "Introduction",
          sort_order: 0,
          sub_lessons: [{ count: 2 }],
        },
        {
          id: "lesson-2",
          title: "Research",
          sort_order: 1,
          sub_lessons: [{ count: 0 }],
        },
      ],
    });

    requireAdmin.mockResolvedValue({
      supabase,
      user: ADMIN_USER,
      profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
      error: null,
    });

    const response = await getCourseLessons(
      new Request("http://localhost/api/admin/courses/course-1/lessons"),
      { params: Promise.resolve({ id: "course-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lessons).toEqual([
      {
        id: "lesson-1",
        name: "Introduction",
        subLessons: 2,
        sortOrder: 0,
      },
      {
        id: "lesson-2",
        name: "Research",
        subLessons: 0,
        sortOrder: 1,
      },
    ]);
  });

  it("returns an empty lessons array when none exist", async () => {
    const supabase = createMockSupabase({ lessonsSelect: [] });

    requireAdmin.mockResolvedValue({
      supabase,
      user: ADMIN_USER,
      profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
      error: null,
    });

    const response = await getCourseLessons(
      new Request("http://localhost/api/admin/courses/course-empty/lessons"),
      { params: Promise.resolve({ id: "course-empty" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lessons).toEqual([]);
  });
});
