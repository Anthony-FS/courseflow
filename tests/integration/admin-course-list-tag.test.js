import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
  };
});

import { requireAdmin } from "@/lib/auth";
import { GET as getAdminCourses } from "@/app/api/admin/courses/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

const COURSE_ROWS = [
  {
    id: "course-dev",
    title: "Cloud Computing Architecture",
    course_code: "CC10",
    cover_file_url: null,
    cover_file_type: null,
    cover_image_url: "/courses/service-design.svg",
    price: 8500,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    tag_id: "tag-development",
    course_tags: { slug: "development", name: "Development" },
    lessons: [{ count: 4 }],
  },
  {
    id: "course-mkt",
    title: "SEO & Search Ranking Strategy",
    course_code: "MKT501",
    cover_file_url: null,
    cover_file_type: null,
    cover_image_url: "/courses/service-design.svg",
    price: 6500,
    is_active: true,
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    tag_id: "tag-marketing",
    course_tags: { slug: "marketing", name: "Marketing" },
    lessons: [{ count: 4 }],
  },
];

function adminRequest(path) {
  const url = new URL(path, "http://localhost");
  return Object.assign(new Request(url), { nextUrl: url });
}

function allowAdmin(supabase) {
  requireAdmin.mockResolvedValue({
    supabase,
    user: ADMIN_USER,
    profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
    error: null,
  });
}

describe("GET /api/admin/courses tag filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes tag and tag_name on listed courses", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROWS });
    allowAdmin(supabase);

    const response = await getAdminCourses(
      adminRequest("/api/admin/courses?page=1&pageSize=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.courses).toHaveLength(2);
    expect(body.courses[0]).toMatchObject({
      tag: "development",
      tag_name: "Development",
    });
    expect(body.courses[1]).toMatchObject({
      tag: "marketing",
      tag_name: "Marketing",
    });
  });

  it("filters courses by tag slug from the database", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROWS });
    allowAdmin(supabase);

    const response = await getAdminCourses(
      adminRequest("/api/admin/courses?page=1&pageSize=10&tag=marketing"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.courses).toHaveLength(1);
    expect(body.courses[0].course_code).toBe("MKT501");
    expect(body.courses[0].tag).toBe("marketing");
    expect(body.total).toBe(1);
  });

  it("returns an empty list for an unknown tag slug without failing", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROWS });
    allowAdmin(supabase);

    const response = await getAdminCourses(
      adminRequest("/api/admin/courses?page=1&pageSize=10&tag=not-a-real-tag"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.courses).toEqual([]);
    expect(body.total).toBe(0);
  });
});
