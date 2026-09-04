import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MemberAssignmentPagination } from "@/components/assignments/member-assignment-pagination";
import {
  MemberAssignmentTable,
  getMemberAssignmentPage,
  memberAssignmentListReducer,
  uniqueMemberAssignmentCourses,
} from "@/components/assignments/member-assignment-table";

const SERVICE_DESIGN_ID = "course-service-design";
const BASIC_PROGRAMMING_ID = "course-basic-programming";

function assignments(count = 23) {
  return Array.from({ length: count }, (_, index) => {
    const isProgramming = index >= 20;
    return {
      id: `assignment-${index + 1}`,
      title: index === 14 ? "Special research" : `Assignment ${String(index + 1).padStart(2, "0")}`,
      courseId: isProgramming ? BASIC_PROGRAMMING_ID : SERVICE_DESIGN_ID,
      courseTitle: isProgramming ? "Basic Programming" : "Service Design",
      lessonTitle: "Research",
      subLessonTitle: `Topic ${index + 1}`,
      status: index % 2 === 0 ? "submitted" : "pending",
      href: `/courses/service-design/learn?subLessonId=topic-${index + 1}`,
    };
  });
}

function buttonsByLabel(tree) {
  const found = new Map();
  function visit(node) {
    if (!React.isValidElement(node)) return;
    if (node.type === "button" && node.props["aria-label"]) {
      found.set(node.props["aria-label"], node);
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return found;
}

describe("member assignment pagination data", () => {
  it("returns correct first and later page items without mutating assignments", () => {
    const rows = assignments();
    const original = [...rows];

    expect(getMemberAssignmentPage(rows, "", 1).assignments.map((row) => row.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `assignment-${index + 1}`),
    );
    expect(getMemberAssignmentPage(rows, "", 3).assignments.map((row) => row.id)).toEqual([
      "assignment-21",
      "assignment-22",
      "assignment-23",
    ]);
    expect(rows).toEqual(original);
  });

  it("searches the complete collection before paginating", () => {
    const rows = assignments();
    const result = getMemberAssignmentPage(rows, "special", 2);

    expect(result.filteredAssignments.map((row) => row.id)).toEqual(["assignment-15"]);
    expect(result.assignments.map((row) => row.id)).toEqual(["assignment-15"]);
    expect(result.currentPage).toBe(1);
  });

  it("resets after search, restores pagination when cleared, and clamps reduced results", () => {
    const rows = assignments();
    const searchedState = memberAssignmentListReducer(
      { query: "", currentPage: 3 },
      { type: "search", query: "special" },
    );
    expect(searchedState).toEqual({ query: "special", currentPage: 1 });

    const clearedState = memberAssignmentListReducer(
      searchedState,
      { type: "search", query: "" },
    );
    const restored = getMemberAssignmentPage(
      rows,
      clearedState.query,
      clearedState.currentPage,
    );
    expect(restored.totalPages).toBe(3);
    expect(restored.assignments).toHaveLength(10);

    const clamped = getMemberAssignmentPage(rows.slice(0, 5), "", 3);
    expect(clamped.currentPage).toBe(1);
    expect(clamped.assignments).toHaveLength(5);
  });

  it("preserves the no-results state and omits pagination for an empty collection", () => {
    const noResults = renderToStaticMarkup(
      React.createElement(MemberAssignmentTable, {
        assignments: assignments(3).filter(() => false),
      }),
    );

    expect(noResults).toContain("No assignments match your filters.");
    expect(noResults).not.toContain('aria-label="Assignment pagination"');
  });

  it("keeps course and status filters when searching and resets the page", () => {
    const nextState = memberAssignmentListReducer(
      {
        query: "",
        courseId: SERVICE_DESIGN_ID,
        status: "pending",
        currentPage: 3,
      },
      { type: "search", query: "special" },
    );

    expect(nextState).toEqual({
      query: "special",
      courseId: SERVICE_DESIGN_ID,
      status: "pending",
      currentPage: 1,
    });
  });

  it("resets to page 1 when the course or status filter changes", () => {
    const courseState = memberAssignmentListReducer(
      {
        query: "research",
        courseId: "all",
        status: "all",
        currentPage: 2,
      },
      { type: "course", courseId: BASIC_PROGRAMMING_ID },
    );
    const statusState = memberAssignmentListReducer(courseState, {
      type: "status",
      status: "submitted",
    });

    expect(courseState.currentPage).toBe(1);
    expect(courseState.courseId).toBe(BASIC_PROGRAMMING_ID);
    expect(statusState).toMatchObject({
      query: "research",
      courseId: BASIC_PROGRAMMING_ID,
      status: "submitted",
      currentPage: 1,
    });
  });

  it("filters by course and status before paginating", () => {
    const rows = assignments();
    const byCourse = getMemberAssignmentPage(rows, "", 1, 10, {
      courseId: BASIC_PROGRAMMING_ID,
    });
    const pending = getMemberAssignmentPage(rows, "", 2, 10, {
      status: "pending",
    });

    expect(byCourse.filteredAssignments.map((row) => row.id)).toEqual([
      "assignment-21",
      "assignment-22",
      "assignment-23",
    ]);
    expect(byCourse.assignments).toHaveLength(3);
    expect(pending.filteredAssignments.every((row) => row.status === "pending")).toBe(
      true,
    );
    expect(pending.filteredAssignments).toHaveLength(11);
    expect(pending.assignments).toHaveLength(1);
    expect(pending.currentPage).toBe(2);
  });

  it("builds unique course options sorted by title", () => {
    expect(uniqueMemberAssignmentCourses(assignments())).toEqual([
      { value: BASIC_PROGRAMMING_ID, label: "Basic Programming" },
      { value: SERVICE_DESIGN_ID, label: "Service Design" },
    ]);
  });
});

describe("MemberAssignmentPagination", () => {
  it("navigates with Previous, Next, and page-number buttons", () => {
    const onPageChange = vi.fn();
    const buttons = buttonsByLabel(
      MemberAssignmentPagination({
        currentPage: 2,
        totalPages: 3,
        onPageChange,
      }),
    );

    buttons.get("Previous page").props.onClick();
    buttons.get("Next page").props.onClick();
    buttons.get("Go to page 3").props.onClick();

    expect(onPageChange.mock.calls).toEqual([[1], [3], [3]]);
  });

  it("disables boundary controls and marks the active page", () => {
    const first = buttonsByLabel(
      MemberAssignmentPagination({ currentPage: 1, totalPages: 3, onPageChange: vi.fn() }),
    );
    const last = buttonsByLabel(
      MemberAssignmentPagination({ currentPage: 3, totalPages: 3, onPageChange: vi.fn() }),
    );

    expect(first.get("Previous page").props.disabled).toBe(true);
    expect(first.get("Next page").props.disabled).toBe(false);
    expect(last.get("Next page").props.disabled).toBe(true);
    expect(last.get("Previous page").props.disabled).toBe(false);
    expect(last.get("Go to page 3").props["aria-current"]).toBe("page");
  });

  it("keeps existing Status and View rendering", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberAssignmentTable, { assignments: assignments(11) }),
    );

    expect(html).toContain("Submitted");
    expect(html).toContain("Pending");
    expect(html).toContain("All courses");
    expect(html).toContain("All status");
    expect(html).toContain(">View<");
    expect(html).toContain("/courses/service-design/learn?subLessonId=topic-1");
    expect(html).toContain('aria-label="Assignment pagination"');
  });
});
