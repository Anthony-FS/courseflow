import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createMockSupabase,
  deletesFor,
} from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { DELETE as deleteCourse } from "@/app/api/admin/courses/[id]/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

describe("DELETE /api/admin/courses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes related sub-lessons and lessons before the course", async () => {
    const supabase = createMockSupabase();
    requireAdmin.mockResolvedValue({
      supabase,
      user: ADMIN_USER,
      profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
      error: null,
    });

    const response = await deleteCourse(
      new Request("http://localhost/api/admin/courses/course-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "course-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);

    expect(deletesFor(supabase, "sub_lessons")[0].filters).toEqual([
      { column: "course_id", value: "course-1" },
    ]);
    expect(deletesFor(supabase, "lessons")[0].filters).toEqual([
      { column: "course_id", value: "course-1" },
    ]);
    expect(deletesFor(supabase, "courses")[0].filters).toEqual([
      { column: "id", value: "course-1" },
    ]);

    expect(supabase.deletes.map((entry) => entry.table)).toEqual([
      "sub_lessons",
      "lessons",
      "courses",
    ]);
  });
});
