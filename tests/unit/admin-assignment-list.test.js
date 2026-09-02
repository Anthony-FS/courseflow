import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_SORT_OPTIONS,
  filterAdminAssignmentsByStatus,
  isAssignmentFilteredOutByStatus,
  processAdminAssignments,
  sortAdminAssignments,
} from "@/lib/admin-assignment-list";

const ROWS = [
  {
    id: "1",
    title: "Beta assignment",
    courseTitle: "Alpha course",
    lessonTitle: "Research",
    subLessonTitle: "Interviews",
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    is_active: true,
  },
  {
    id: "2",
    title: "Alpha assignment",
    courseTitle: "Zulu course",
    lessonTitle: "Design",
    subLessonTitle: "Wireframes",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    is_active: false,
  },
  {
    id: "3",
    title: "No dates",
    courseTitle: "Beta course",
    lessonTitle: "Research",
    subLessonTitle: "Surveys",
    created_at: null,
    updated_at: null,
    is_active: true,
  },
];

describe("admin assignment filtering and sorting", () => {
  it("filters All, Active, and Inactive assignments", () => {
    expect(filterAdminAssignmentsByStatus(ROWS, "all")).toBe(ROWS);
    expect(filterAdminAssignmentsByStatus(ROWS, "active").map((row) => row.id)).toEqual(["1", "3"]);
    expect(filterAdminAssignmentsByStatus(ROWS, "inactive").map((row) => row.id)).toEqual(["2"]);
  });

  it.each([
    ["title", "asc", ["2", "1", "3"]],
    ["title", "desc", ["3", "1", "2"]],
    ["course", "asc", ["1", "3", "2"]],
    ["course", "desc", ["2", "3", "1"]],
    ["createdAt", "asc", ["2", "1", "3"]],
    ["createdAt", "desc", ["1", "2", "3"]],
    ["updatedAt", "asc", ["2", "1", "3"]],
    ["updatedAt", "desc", ["1", "2", "3"]],
  ])("sorts %s %s without mutating source", (sortBy, direction, expected) => {
    const original = [...ROWS];
    expect(sortAdminAssignments(ROWS, sortBy, direction).map((row) => row.id)).toEqual(expected);
    expect(ROWS).toEqual(original);
  });

  it("sorts raw timestamps and keeps missing values last in both directions", () => {
    expect(sortAdminAssignments(ROWS, "createdAt", "asc").at(-1).id).toBe("3");
    expect(sortAdminAssignments(ROWS, "createdAt", "desc").at(-1).id).toBe("3");
  });

  it("processes search, status, sort, then pagination", () => {
    const repeated = [
      ...ROWS,
      { ...ROWS[0], id: "4", title: "Research C", updated_at: "2026-05-01" },
      { ...ROWS[0], id: "5", title: "Research A", updated_at: "2026-06-01" },
    ];
    const result = processAdminAssignments(repeated, {
      query: "research",
      status: "active",
      sortBy: "title",
      sortDirection: "asc",
      page: 2,
      pageSize: 2,
    });

    expect(result.total).toBe(4);
    expect(result.assignments.map((row) => row.id)).toEqual(["5", "4"]);
  });

  it("removes toggled rows only when they no longer match the selected filter", () => {
    expect(isAssignmentFilteredOutByStatus("active", false)).toBe(true);
    expect(isAssignmentFilteredOutByStatus("inactive", true)).toBe(true);
    expect(isAssignmentFilteredOutByStatus("all", false)).toBe(false);
    expect(isAssignmentFilteredOutByStatus("active", true)).toBe(false);
  });

  it("defines accessible Course-style sorting controls and resets control changes to page 1", () => {
    expect(ASSIGNMENT_SORT_OPTIONS.map((option) => option.label)).toEqual([
      "Assignment detail",
      "Course",
      "Created date",
      "Updated date",
    ]);

    const pageSource = readFileSync(
      new URL("../../src/app/admin/assignments/page.js", import.meta.url),
      "utf8",
    );
    expect(pageSource).toContain('ariaLabel="Filter assignments by status"');
    expect(pageSource).toContain("<SortFilterBar");
    expect(pageSource.match(/setCurrentPage\(1\)/g)).toHaveLength(3);
  });
});
