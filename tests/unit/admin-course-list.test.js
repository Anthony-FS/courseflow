import { describe, expect, it } from "vitest";

import { resolveCoverUrl, searchCourses } from "@/lib/courses";
import { formatCourseDate, formatPrice } from "@/lib/format";

const FALLBACK_COVER = "/courses/service-design.svg";

const courses = [
  { id: "1", title: "Service Design Essentials" },
  { id: "2", title: "UX Research Basics" },
  { id: "3", title: "service blueprint workshop" },
];

describe("searchCourses", () => {
  // ค้นหาจากชื่อคอร์สอย่างเดียว ไม่สนตัวพิมพ์
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

  it("returns an empty list when no title matches", () => {
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
    expect(resolveCoverUrl(null)).toBe(FALLBACK_COVER);
  });

  it("keeps http(s) and root-relative urls", () => {
    expect(resolveCoverUrl("https://cdn.example/cover.jpg")).toBe(
      "https://cdn.example/cover.jpg",
    );
    expect(resolveCoverUrl("/uploads/cover.png")).toBe("/uploads/cover.png");
  });

  it("uses the fallback cover for unsupported paths", () => {
    expect(resolveCoverUrl("course-covers/admin/cover.jpg")).toBe(FALLBACK_COVER);
  });
});
