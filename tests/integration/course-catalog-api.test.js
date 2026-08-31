import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/courses", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCatalogCourses: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/enrollments", () => ({
  getUserEnrolledCourseIds: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

import { createServiceClient } from "@/lib/supabase/server";
import { getCatalogCourses } from "@/lib/courses";
import { getSessionUser } from "@/lib/auth";
import { getUserEnrolledCourseIds } from "@/lib/enrollments";
import { checkRateLimit } from "@/lib/rate-limit";
import { GET } from "@/app/api/courses/route";

function getCourses(search = "page=1&pageSize=12") {
  return GET(new Request(`http://localhost/api/courses?${search}`));
}

describe("GET /api/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServiceClient.mockReturnValue({ mocked: true });
    getCatalogCourses.mockResolvedValue({ courses: [], total: 0 });
    getSessionUser.mockResolvedValue({ user: null, supabase: { session: true } });
    getUserEnrolledCourseIds.mockResolvedValue([]);
    checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
  });

  it("returns 400 for an invalid page size", async () => {
    const response = await getCourses("page=1&pageSize=10");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/page/i);
    expect(getCatalogCourses).not.toHaveBeenCalled();
  });

  it("returns 400 for page 0", async () => {
    const response = await getCourses("page=0&pageSize=12");
    expect(response.status).toBe(400);
  });

  it("returns 400 when the search query is longer than 100 characters", async () => {
    const response = await getCourses(
      `q=${"a".repeat(101)}&page=1&pageSize=12`,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/too long/i);
    expect(getCatalogCourses).not.toHaveBeenCalled();
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("returns 429 without querying when the catalog rate limit is exceeded", async () => {
    checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 12 });

    const response = await getCourses("page=1&pageSize=12");
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect(body.error).toMatch(/too many searches/i);
    expect(getCatalogCourses).not.toHaveBeenCalled();
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("returns the current page of mapped courses", async () => {
    getCatalogCourses.mockResolvedValue({
      courses: [{ id: "c1", title: "Alpha", lessonCount: 2, hours: 6 }],
      total: 13,
    });

    const response = await getCourses("q=alpha&page=2&pageSize=6");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(13);
    expect(body.courses[0].title).toBe("Alpha");
    expect(getCatalogCourses).toHaveBeenCalledWith(
      { mocked: true },
      {
        query: "alpha",
        page: 2,
        pageSize: 6,
        excludeCourseIds: [],
        sortBy: "",
        sortDirection: "",
      },
    );
  });

  it("forwards sortBy and sortDirection to getCatalogCourses", async () => {
    const response = await getCourses(
      "q=alpha&page=2&pageSize=6&sortBy=title&sortDirection=asc",
    );

    expect(response.status).toBe(200);
    expect(getCatalogCourses).toHaveBeenCalledWith(
      { mocked: true },
      {
        query: "alpha",
        page: 2,
        pageSize: 6,
        excludeCourseIds: [],
        sortBy: "title",
        sortDirection: "asc",
      },
    );
  });

  it("excludes enrolled course ids for a logged-in user", async () => {
    getSessionUser.mockResolvedValue({
      user: { id: "user-1" },
      supabase: { session: true },
    });
    getUserEnrolledCourseIds.mockResolvedValue(["c1", "c2"]);

    const response = await getCourses("page=1&pageSize=12");

    expect(response.status).toBe(200);
    expect(getUserEnrolledCourseIds).toHaveBeenCalledWith(
      { session: true },
      "user-1",
    );
    expect(getCatalogCourses).toHaveBeenCalledWith(
      { mocked: true },
      {
        query: "",
        page: 1,
        pageSize: 12,
        excludeCourseIds: ["c1", "c2"],
        sortBy: "",
        sortDirection: "",
      },
    );
  });

  it("returns the catalog without exclude ids when enrollment lookup fails", async () => {
    getSessionUser.mockResolvedValue({
      user: { id: "user-1" },
      supabase: { session: true },
    });
    getUserEnrolledCourseIds.mockRejectedValue(new Error("enrollments down"));

    const response = await getCourses("page=1&pageSize=12");

    expect(response.status).toBe(200);
    expect(getCatalogCourses).toHaveBeenCalledWith(
      { mocked: true },
      {
        query: "",
        page: 1,
        pageSize: 12,
        excludeCourseIds: [],
        sortBy: "",
        sortDirection: "",
      },
    );
  });

  it("returns 500 without querying when the service client is unavailable in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    createServiceClient.mockReturnValue(null);

    try {
      const response = await getCourses();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toMatch(/catalog is unavailable/i);
      expect(getCatalogCourses).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("returns 500 when the catalog query fails", async () => {
    getCatalogCourses.mockRejectedValue(new Error("db down"));

    const response = await getCourses("page=1&pageSize=12");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/db down/i);
  });
});
