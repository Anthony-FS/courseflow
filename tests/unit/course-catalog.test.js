import { describe, expect, it } from "vitest";

import {
  CATALOG_COLUMNS,
  CATALOG_DEBOUNCE_MS,
  catalogPageSizeFromWidth,
  catalogRange,
  catalogRequestUrl,
  catalogSearchFilter,
  mapCatalogCourse,
  parseCatalogPageSize,
  getCatalogCourses,
  FALLBACK_COVER,
} from "@/lib/courses";

describe("catalog constants", () => {
  it("debounces for 300ms and selects only card columns", () => {
    expect(CATALOG_DEBOUNCE_MS).toBe(300);
    expect(CATALOG_COLUMNS).toBe(
      "id, course_code, title, summary, cover_image_url, total_learning_time, created_at, lessons(count)",
    );
    expect(CATALOG_COLUMNS).not.toMatch(/description|price|video_trailer/);
  });
});

describe("catalogPageSizeFromWidth", () => {
  it("uses 6 cards at 760px and below", () => {
    expect(catalogPageSizeFromWidth(760)).toBe(6);
    expect(catalogPageSizeFromWidth(375)).toBe(6);
  });

  it("uses 12 cards at 761px and above", () => {
    expect(catalogPageSizeFromWidth(761)).toBe(12);
    expect(catalogPageSizeFromWidth(1440)).toBe(12);
  });
});

describe("parseCatalogPageSize", () => {
  it("accepts only 6 and 12", () => {
    expect(parseCatalogPageSize("6")).toBe(6);
    expect(parseCatalogPageSize("12")).toBe(12);
    expect(parseCatalogPageSize("10")).toBeNull();
    expect(parseCatalogPageSize("0")).toBeNull();
  });
});

describe("catalogRange", () => {
  it("maps desktop page 2 to rows 12–23", () => {
    expect(catalogRange(2, 12)).toEqual({ from: 12, to: 23 });
  });

  it("maps mobile page 1 to rows 0–5", () => {
    expect(catalogRange(1, 6)).toEqual({ from: 0, to: 5 });
  });
});

describe("catalogSearchFilter", () => {
  it("returns null for blank queries", () => {
    expect(catalogSearchFilter("")).toBeNull();
    expect(catalogSearchFilter("   ")).toBeNull();
  });

  it("matches title or summary and strips or-separator commas", () => {
    expect(catalogSearchFilter("  ux  ")).toBe(
      "title.ilike.%ux%,summary.ilike.%ux%",
    );
    expect(catalogSearchFilter("a,b")).toBe(
      "title.ilike.%a b%,summary.ilike.%a b%",
    );
  });

  it("strips PostgREST grouping characters from search queries", () => {
    const filter = catalogSearchFilter('Design (UX) "Basics"');

    expect(filter).not.toMatch(/[()"]/);
  });
});

describe("mapCatalogCourse", () => {
  it("maps card fields and formats missing time as 0 hours", () => {
    const course = mapCatalogCourse({
      id: "c1",
      course_code: "SD101",
      title: "Service Design Essentials",
      summary: "Learn service design",
      cover_image_url: "",
      total_learning_time: "",
      lessons: [{ count: 6 }],
    });

    expect(course).toEqual({
      id: "c1",
      courseCode: "SD101",
      title: "Service Design Essentials",
      summary: "Learn service design",
      coverUrl: FALLBACK_COVER,
      lessonCount: 6,
      hours: 0,
    });
  });

  it("parses stored learning hours", () => {
    expect(mapCatalogCourse({ total_learning_time: "6", lessons: [] }).hours).toBe(6);
  });
});

describe("catalogRequestUrl", () => {
  it("builds the catalog GET query string", () => {
    expect(
      catalogRequestUrl({ query: " design ", page: 2, pageSize: 12 }),
    ).toBe("/api/courses?q=design&page=2&pageSize=12");
  });
});

function createCatalogSupabase({ data = [], count = 0, error = null } = {}) {
  const calls = {};
  const chain = {
    select(columns, options) {
      calls.select = { columns, options };
      return chain;
    },
    or(filter) {
      calls.or = filter;
      return chain;
    },
    order(column, options) {
      calls.order = { column, options };
      return chain;
    },
    range(from, to) {
      calls.range = { from, to };
      return Promise.resolve({ data, error, count });
    },
  };

  return {
    calls,
    from(table) {
      calls.table = table;
      return chain;
    },
  };
}

describe("getCatalogCourses", () => {
  it("queries the current page without a search filter when q is empty", async () => {
    const supabase = createCatalogSupabase({
      data: [
        {
          id: "c1",
          course_code: "A",
          title: "Alpha",
          summary: "s",
          cover_image_url: "/a.jpg",
          total_learning_time: "4",
          lessons: [{ count: 2 }],
        },
      ],
      count: 20,
    });

    const result = await getCatalogCourses(supabase, {
      query: "  ",
      page: 1,
      pageSize: 12,
    });

    expect(supabase.calls.table).toBe("courses");
    expect(supabase.calls.select.columns).toBe(CATALOG_COLUMNS);
    expect(supabase.calls.select.options).toEqual({ count: "exact" });
    expect(supabase.calls.or).toBeUndefined();
    expect(supabase.calls.order).toEqual({
      column: "created_at",
      options: { ascending: false },
    });
    expect(supabase.calls.range).toEqual({ from: 0, to: 11 });
    expect(result.total).toBe(20);
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].title).toBe("Alpha");
  });

  it("applies title/summary or-filter and mobile range", async () => {
    const supabase = createCatalogSupabase({ data: [], count: 0 });

    await getCatalogCourses(supabase, {
      query: "ux",
      page: 2,
      pageSize: 6,
    });

    expect(supabase.calls.or).toBe("title.ilike.%ux%,summary.ilike.%ux%");
    expect(supabase.calls.range).toEqual({ from: 6, to: 11 });
  });

  it("rejects invalid page size", async () => {
    await expect(
      getCatalogCourses(createCatalogSupabase(), { page: 1, pageSize: 10 }),
    ).rejects.toThrow(/invalid catalog page/i);
  });
});
