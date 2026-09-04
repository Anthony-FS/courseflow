import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonError } from "@/lib/api";
import { createMockSupabase } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { GET as getAdminCourseTags } from "@/app/api/admin/course-tags/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

function allowAdmin(supabase) {
  requireAdmin.mockResolvedValue({
    supabase,
    user: ADMIN_USER,
    profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
    error: null,
  });
}

describe("GET /api/admin/course-tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the caller is not an admin", async () => {
    requireAdmin.mockResolvedValue({
      supabase: { from: vi.fn() },
      user: null,
      error: jsonError("Unauthorized", 401),
    });

    const response = await getAdminCourseTags();
    expect(response.status).toBe(401);
  });

  it("returns slug and name from course_tags", async () => {
    const supabase = createMockSupabase();
    allowAdmin(supabase);

    const response = await getAdminCourseTags();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tags).toEqual(
      expect.arrayContaining([
        { slug: "development", name: "Development" },
        { slug: "marketing", name: "Marketing" },
        { slug: "business", name: "Business" },
      ]),
    );
    expect(body.tags).toHaveLength(3);
  });
});
