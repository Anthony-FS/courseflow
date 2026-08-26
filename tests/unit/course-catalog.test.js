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
  parseCatalogSortBy,
  parseCatalogSortDirection,
  getCatalogCourses,
  FALLBACK_COVER,
} from "@/lib/courses";

describe("catalog constants", () => {
  it("debounces for 300ms and selects only card columns", () => {
    expect(CATALOG_DEBOUNCE_MS).toBe(300);
    expect(CATALOG_COLUMNS).toBe(
      "id, course_code, title, summary, cover_image_url, cover_file_url, total_learning_time, price, created_at, updated_at, lessons(count)",
    );
    expect(CATALOG_COLUMNS).not.toMatch(/description|video_trailer/);
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
      code: "SD101",
      courseCode: "SD101",
      title: "Service Design Essentials",
      summary: "Learn service design",
      coverUrl: FALLBACK_COVER,
      lessonCount: 6,
      hours: 0,
      totalLearningTime: "",
      price: 0,
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
    ).toBe(
      "/api/courses?q=design&page=2&pageSize=12&sortBy=createdAt&sortDirection=desc",
    );
  });
});

function createCatalogSupabase({ data = [], count = 0, error = null } = {}) {
  const calls = { orders: [] };
  const result = { data, error, count };
  const chain = {
    select(columns, options) {
      calls.select = { columns, options };
      return chain;
    },
    or(filter) {
      calls.or = filter;
      return chain;
    },
    not(column, operator, value) {
      calls.not = { column, operator, value };
      return chain;
    },
    order(column, options) {
      calls.orders.push({ column, options });
      return chain;
    },
    range(from, to) {
      calls.range = { from, to };
      return Promise.resolve(result);
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
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
    expect(supabase.calls.orders).toEqual([
      { column: "created_at", options: { ascending: false, nullsFirst: false } },
      { column: "id", options: { ascending: true } },
    ]);
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

  it("does not apply not-in when excludeCourseIds is omitted or empty", async () => {
    const omitted = createCatalogSupabase();
    await getCatalogCourses(omitted, { page: 1, pageSize: 12 });
    expect(omitted.calls.not).toBeUndefined();

    const empty = createCatalogSupabase();
    await getCatalogCourses(empty, {
      page: 1,
      pageSize: 12,
      excludeCourseIds: [],
    });
    expect(empty.calls.not).toBeUndefined();
  });

  it("excludes unique enrolled ids before search and pagination", async () => {
    const supabase = createCatalogSupabase({ data: [], count: 0 });

    await getCatalogCourses(supabase, {
      query: "ux",
      page: 2,
      pageSize: 6,
      excludeCourseIds: ["c1", " c1 ", "", "c2"],
    });

    expect(supabase.calls.not).toEqual({
      column: "id",
      operator: "in",
      value: "(c1,c2)",
    });
    expect(supabase.calls.or).toBe("title.ilike.%ux%,summary.ilike.%ux%");
    expect(supabase.calls.range).toEqual({ from: 6, to: 11 });
  });
});

describe("parseCatalogSort", () => {
  it("defaults unknown or blank sort to createdAt desc", () => {
    expect(parseCatalogSortBy(undefined)).toBe("createdAt");
    expect(parseCatalogSortBy("nope")).toBe("createdAt");
    expect(parseCatalogSortBy("constructor")).toBe("createdAt");
    expect(parseCatalogSortDirection(undefined)).toBe("desc");
    expect(parseCatalogSortDirection("up")).toBe("desc");
    expect(parseCatalogSortDirection("asc")).toBe("asc");
  });
});

describe("catalogRequestUrl sort", () => {
  it("includes the requested sort params", () => {
    expect(
      catalogRequestUrl({
        query: "",
        page: 1,
        pageSize: 12,
        sortBy: "title",
        sortDirection: "asc",
      }),
    ).toBe(
      "/api/courses?q=&page=1&pageSize=12&sortBy=title&sortDirection=asc",
    );
  });
});

describe("getCatalogCourses sort", () => {
  it("orders title then id and still ranges the page", async () => {
    const supabase = createCatalogSupabase();
    await getCatalogCourses(supabase, {
      page: 2,
      pageSize: 6,
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(supabase.calls.orders).toEqual([
      { column: "title", options: { ascending: true, nullsFirst: false } },
      { column: "id", options: { ascending: true } },
    ]);
    expect(supabase.calls.range).toEqual({ from: 6, to: 11 });
  });

  it("falls back to created_at for invalid sortBy", async () => {
    const supabase = createCatalogSupabase();
    await getCatalogCourses(supabase, {
      page: 1,
      pageSize: 12,
      sortBy: "nope",
      sortDirection: "asc",
    });

    expect(supabase.calls.orders[0]).toEqual({
      column: "created_at",
      options: { ascending: true, nullsFirst: false },
    });
  });

  it("sorts lesson count in memory and slices the page", async () => {
    const supabase = createCatalogSupabase({
      data: [
        { id: "c1", title: "A", lessons: [{ count: 9 }], total_learning_time: "1" },
        { id: "c2", title: "B", lessons: [{ count: 1 }], total_learning_time: "1" },
        { id: "c3", title: "C", lessons: [{ count: 5 }], total_learning_time: "1" },
      ],
      count: 3,
    });

    const result = await getCatalogCourses(supabase, {
      page: 1,
      pageSize: 6,
      sortBy: "lessonCount",
      sortDirection: "asc",
    });

    expect(supabase.calls.range).toBeUndefined();
    expect(supabase.calls.orders).toEqual([
      { column: "id", options: { ascending: true } },
    ]);
    expect(result.courses.map((course) => course.id)).toEqual(["c2", "c3", "c1"]);
    expect(result.total).toBe(3);
  });

  it("sorts learning time numerically in memory so 2 comes before 10", async () => {
    const supabase = createCatalogSupabase({
      data: [
        { id: "c1", title: "Ten", total_learning_time: "10", lessons: [] },
        { id: "c2", title: "Two", total_learning_time: "2", lessons: [] },
      ],
      count: 2,
    });

    const result = await getCatalogCourses(supabase, {
      page: 1,
      pageSize: 12,
      sortBy: "hours",
      sortDirection: "asc",
    });

    expect(supabase.calls.range).toBeUndefined();
    expect(result.courses.map((course) => course.id)).toEqual(["c2", "c1"]);
  });
});
