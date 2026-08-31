import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonError } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

import { requireAdmin } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { GET as getAdminCourses } from "@/app/api/admin/courses/route";
import { GET as getAdminAssignments } from "@/app/api/admin/assignments/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

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

describe("admin search rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
  });

  it("returns 401 without rate limiting when the caller is not an admin", async () => {
    const from = vi.fn();
    requireAdmin.mockResolvedValue({
      supabase: { from },
      user: null,
      error: jsonError("Unauthorized", 401),
    });

    const response = await getAdminCourses(
      adminRequest("/api/admin/courses?page=1&pageSize=10"),
    );

    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 429 without querying GET /api/admin/courses", async () => {
    const from = vi.fn();
    allowAdmin({ from });
    checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 8 });

    const response = await getAdminCourses(
      adminRequest("/api/admin/courses?q=design&page=1&pageSize=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("8");
    expect(body.error).toMatch(/too many searches/i);
    expect(from).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      "admin-search:unknown",
      expect.objectContaining({ limit: 120, windowMs: 60_000 }),
    );
  });

  it("returns 429 without querying GET /api/admin/assignments", async () => {
    const from = vi.fn();
    allowAdmin({ from });
    checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 15 });

    const response = await getAdminAssignments(
      adminRequest("/api/admin/assignments?q=intro&page=1&pageSize=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("15");
    expect(body.error).toMatch(/too many searches/i);
    expect(from).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      "admin-search:unknown",
      expect.objectContaining({ limit: 120, windowMs: 60_000 }),
    );
  });
});
