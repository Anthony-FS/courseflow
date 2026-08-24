import { describe, expect, it } from "vitest";

import {
  embeddedCount,
  FALLBACK_COVER,
  getCourseByCode,
  mapCourseDetail,
  resolveCoverUrl,
  resolveTrailerUrl,
  searchCourses,
} from "@/lib/courses";
import { formatCourseDate, formatPrice } from "@/lib/format";

const courses = [
  { id: "1", title: "Service Design Essentials", course_code: "SD101" },
  { id: "2", title: "UX Research Basics", course_code: "UX201" },
  { id: "3", title: "service blueprint workshop", course_code: "SD102" },
];

describe("searchCourses", () => {
  // ค้นหาจากชื่อคอร์ส ไม่สนตัวพิมพ์
  it("filters courses whose title contains the query", () => {
    expect(searchCourses(courses, "service").map((course) => course.id)).toEqual(
      ["1", "3"],
    );
  });

  it("matches titles case-insensitively", () => {
    expect(searchCourses(courses, "UX RESEARCH").map((course) => course.id)).toEqual(
      ["2"],
    );
  });

  it("filters courses whose course code contains the query", () => {
    expect(searchCourses(courses, "SD101").map((course) => course.id)).toEqual(
      ["1"],
    );
  });

  it("matches course codes case-insensitively", () => {
    expect(searchCourses(courses, "sd101").map((course) => course.id)).toEqual(
      ["1"],
    );
  });

  // ช่องว่างหน้า-หลังถูก trim ก่อนค้นหา
  it("trims the search query before matching", () => {
    expect(searchCourses(courses, "  essentials  ").map((course) => course.id)).toEqual(
      ["1"],
    );
  });

  // ว่างหรือช่องว่างอย่างเดียว = แสดงทุกรายการ
  it("returns every course when the query is empty or only spaces", () => {
    expect(searchCourses(courses, "")).toBe(courses);
    expect(searchCourses(courses, "   ")).toBe(courses);
  });

  it("returns an empty list when no title or course code matches", () => {
    expect(searchCourses(courses, "zzzznotfound")).toEqual([]);
  });
});

describe("formatPrice", () => {
  it("formats zero as two decimal places", () => {
    expect(formatPrice(0)).toBe("0.00");
    expect(formatPrice("0")).toBe("0.00");
  });

  it("formats a number with two decimal places", () => {
    expect(formatPrice(3559)).toBe("3,559.00");
  });
});

describe("formatCourseDate", () => {
  it("returns an empty string for an invalid date", () => {
    expect(formatCourseDate("not-a-date")).toBe("");
  });

  it("formats a valid local date as DD/MM/YYYY h:mmAM/PM", () => {
    expect(formatCourseDate("2026-08-14T14:53:00")).toBe("14/08/2026 2:53PM");
  });
});

describe("resolveCoverUrl", () => {
  it("uses the fallback cover when the url is missing", () => {
    expect(resolveCoverUrl("")).toBe(FALLBACK_COVER);
    expect(resolveCoverUrl("   ")).toBe(FALLBACK_COVER);
    expect(resolveCoverUrl(null)).toBe(FALLBACK_COVER);
  });

  it("keeps http(s) and root-relative urls", () => {
    expect(resolveCoverUrl("https://cdn.example/cover.jpg")).toBe(
      "https://cdn.example/cover.jpg",
    );
    expect(resolveCoverUrl("/uploads/cover.png")).toBe("/uploads/cover.png");
  });

  it("builds a public storage url for cover object paths", () => {
    expect(
      resolveCoverUrl(
        "course-covers/admin/cover.jpg",
        "https://xyz.supabase.co",
      ),
    ).toBe(
      "https://xyz.supabase.co/storage/v1/object/public/course-covers/admin/cover.jpg",
    );
  });

  it("uses the fallback cover when a storage path has no supabase url", () => {
    expect(resolveCoverUrl("course-covers/admin/cover.jpg", "")).toBe(
      FALLBACK_COVER,
    );
  });
});

describe("embeddedCount", () => {
  it("reads a PostgREST embedded count from lessons", () => {
    expect(embeddedCount([{ count: 2 }])).toBe(2);
  });

  it("returns 0 when there are no related rows", () => {
    expect(embeddedCount([])).toBe(0);
    expect(embeddedCount(undefined)).toBe(0);
  });
});

describe("resolveTrailerUrl", () => {
  it("returns null when the trailer url is missing", () => {
    expect(resolveTrailerUrl("")).toBeNull();
    expect(resolveTrailerUrl(null)).toBeNull();
  });

  it("keeps http(s) and root-relative urls", () => {
    expect(resolveTrailerUrl("https://cdn.example/trailer.mp4")).toBe(
      "https://cdn.example/trailer.mp4",
    );
    expect(resolveTrailerUrl("/uploads/trailer.mp4")).toBe("/uploads/trailer.mp4");
  });

  it("builds a public storage url for trailer object paths", () => {
    expect(
      resolveTrailerUrl(
        "course-trailers/admin/trailer.mp4",
        "https://xyz.supabase.co",
      ),
    ).toBe(
      "https://xyz.supabase.co/storage/v1/object/public/course-trailers/admin/trailer.mp4",
    );
  });
});

describe("mapCourseDetail", () => {
  it("maps course fields and sorts lessons and sub-lessons", () => {
    const detail = mapCourseDetail({
      id: "course-1",
      title: "Service Design Essentials",
      summary: "Short summary",
      description: "Long description",
      price: 3559,
      cover_image_url: "/courses/service-design.svg",
      video_trailer_url: "/trailer.mp4",
      lessons: [
        {
          id: "l2",
          title: "Prototyping",
          sort_order: 2,
          sub_lessons: [],
        },
        {
          id: "l1",
          title: "Introduction",
          sort_order: 1,
          sub_lessons: [
            { id: "s2", title: "Course Overview", sort_order: 2 },
            { id: "s1", title: "Welcome to the Course", sort_order: 1 },
          ],
        },
      ],
    });

    expect(detail).toMatchObject({
      id: "course-1",
      title: "Service Design Essentials",
      summary: "Short summary",
      description: "Long description",
      price: 3559,
      coverUrl: "/courses/service-design.svg",
      trailerUrl: "/trailer.mp4",
    });
    expect(detail.lessons.map((lesson) => lesson.title)).toEqual([
      "Introduction",
      "Prototyping",
    ]);
    expect(detail.lessons[0].subLessons.map((item) => item.title)).toEqual([
      "Welcome to the Course",
      "Course Overview",
    ]);
  });
});

describe("getCourseByCode", () => {
  it("returns null when the course code is empty", async () => {
    expect(await getCourseByCode({}, "")).toBeNull();
    expect(await getCourseByCode({}, "   ")).toBeNull();
  });

  it("loads a course by course_code and maps the detail", async () => {
    const row = {
      id: "abc",
      title: "UX Research Basics",
      course_code: "SD101",
      summary: "",
      description: "",
      price: 10,
      cover_image_url: "/courses/ux-ui-beginner.svg",
      video_trailer_url: null,
      lessons: [],
    };
    const supabase = {
      from() {
        return {
          select() {
            return {
              ilike() {
                return {
                  limit() {
                    return {
                      maybeSingle: async () => ({ data: row, error: null }),
                    };
                  },
                };
              },
              eq() {
                return {
                  order: async () => ({ data: [], error: null }),
                };
              },
            };
          },
        };
      },
    };

    await expect(getCourseByCode(supabase, "sd101")).resolves.toMatchObject({
      id: "abc",
      courseCode: "SD101",
      title: "UX Research Basics",
      price: 10,
      lessons: [],
    });
  });

  it("loads lessons from the catalog client when the session cannot see them", async () => {
    const courseRow = {
      id: "abc",
      title: "UX Research Basics",
      course_code: "SD101",
      summary: "",
      description: "",
      price: 10,
      cover_image_url: "/courses/ux-ui-beginner.svg",
      video_trailer_url: null,
      lessons: [],
    };
    const catalogLessons = [
      { id: "l1", title: "Introduction", sort_order: 1, sub_lessons: [] },
    ];
    const sessionSupabase = {
      from() {
        return {
          select() {
            return {
              ilike() {
                return {
                  limit() {
                    return {
                      maybeSingle: async () => ({ data: courseRow, error: null }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
    const catalogSupabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  order: async () => ({ data: catalogLessons, error: null }),
                };
              },
            };
          },
        };
      },
    };

    await expect(
      getCourseByCode(sessionSupabase, "SD101", catalogSupabase),
    ).resolves.toMatchObject({
      id: "abc",
      courseCode: "SD101",
      lessons: [{ id: "l1", title: "Introduction", subLessons: [] }],
    });
  });
});
