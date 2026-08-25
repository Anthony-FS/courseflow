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

import { createServiceClient } from "@/lib/supabase/server";
import { getCatalogCourses } from "@/lib/courses";
import { GET } from "@/app/api/courses/route";

function getCourses(search = "page=1&pageSize=12") {
  return GET(new Request(`http://localhost/api/courses?${search}`));
}

describe("GET /api/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServiceClient.mockReturnValue({ mocked: true });
    getCatalogCourses.mockResolvedValue({ courses: [], total: 0 });
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
      { query: "alpha", page: 2, pageSize: 6 },
    );
  });

  it("returns 500 when the catalog query fails", async () => {
    getCatalogCourses.mockRejectedValue(new Error("db down"));

    const response = await getCourses("page=1&pageSize=12");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/db down/i);
  });
});
