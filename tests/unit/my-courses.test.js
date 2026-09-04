import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { MyCourseCard } from "@/components/my-courses/my-course-card";
import { MyCoursesPagination } from "@/components/my-courses/my-courses-pagination";
import {
  MyCoursesProfileCard,
  memberInitials,
} from "@/components/my-courses/my-courses-profile-card";
import {
  clampCourseProgress,
  filterMyCourses,
  getMyCoursesEmptyMessage,
  getMyCoursesPage,
  getMyCoursesSummary,
  myCoursesListReducer,
} from "@/lib/my-courses";

function makeCourses(count = 23) {
  return Array.from({ length: count }, (_, index) => ({
    id: `course-${index + 1}`,
    enrollmentId: `enrollment-${index + 1}`,
    code: `COURSE-${index + 1}`,
    title: `Course ${index + 1}`,
    summary: `Description ${index + 1}`,
    coverUrl: "/courses/service-design.svg",
    lessonCount: index + 1,
    totalLearningTime: "6",
    price: 9999,
    progress: index === 0 ? 0 : index === 1 ? 42 : index === 2 ? 100 : 25,
  }));
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

describe("My Courses progress and cards", () => {
  it("clamps invalid, 0%, partial, and completed progress", () => {
    expect([
      clampCourseProgress(-12),
      clampCourseProgress(undefined),
      clampCourseProgress(42.4),
      clampCourseProgress(180),
    ]).toEqual([0, 0, 42, 100]);
  });

  it.each([
    [undefined, 0],
    [42, 42],
    [130, 100],
  ])("renders accessible progress for %s without a price", (progress, expected) => {
    const course = { ...makeCourses(1)[0], progress };
    const html = renderToStaticMarkup(React.createElement(MyCourseCard, { course }));

    expect(html).toContain(`${expected}% Complete`);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain(`aria-valuenow="${expected}"`);
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain(`width:${expected}%`);
    expect(html).not.toContain("THB");
    expect(html).not.toContain("9,999");
    expect(html).toContain('href="/courses/COURSE-1/learn"');
    expect(html).toContain("1 Lesson");
    expect(html).toContain("6 Hours");
  });
});

describe("My Courses profile summary", () => {
  it("renders supplied member data and real counter values", () => {
    const html = renderToStaticMarkup(
      React.createElement(MyCoursesProfileCard, {
        member: {
          displayName: "Mali Srisuk",
          avatarUrl: "https://example.com/mali.jpg",
        },
        inProgress: 4,
        completed: 2,
      }),
    );

    expect(html).toContain("Mali Srisuk");
    expect(html).toContain("https://example.com/mali.jpg");
    expect(html).toContain("Course In Progress");
    expect(html).toContain(">4<");
    expect(html).toContain("Course Complete");
    expect(html).toContain(">2<");
  });

  it("uses the established User initials fallback when profile data is absent", () => {
    const html = renderToStaticMarkup(
      React.createElement(MyCoursesProfileCard, {
        member: null,
        inProgress: 0,
        completed: 0,
      }),
    );

    expect(memberInitials("Mali Srisuk")).toBe("MS");
    expect(html).toContain("User");
    expect(html).toContain('aria-label="User profile initials"');
    expect(html).toContain(">U<");
    expect(html).not.toContain("profile photo");
  });
});

describe("My Courses filtering, summary, and pagination", () => {
  it("filters All, In Progress, and Completed without mutating order", () => {
    const courses = makeCourses(4);
    const original = [...courses];

    expect(filterMyCourses(courses, "all").map((course) => course.id)).toEqual([
      "course-1", "course-2", "course-3", "course-4",
    ]);
    expect(filterMyCourses(courses, "in-progress").map((course) => course.id)).toEqual([
      "course-1", "course-2", "course-4",
    ]);
    expect(filterMyCourses(courses, "completed").map((course) => course.id)).toEqual([
      "course-3",
    ]);
    expect(courses).toEqual(original);
    expect(getMyCoursesSummary(courses)).toEqual({ inProgress: 3, completed: 1 });
  });

  it("paginates after filtering and returns correct first and later pages", () => {
    const courses = makeCourses(23);
    expect(getMyCoursesPage(courses, "all", 1).courses.map((course) => course.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `course-${index + 1}`),
    );
    expect(getMyCoursesPage(courses, "all", 3).courses.map((course) => course.id)).toEqual([
      "course-21", "course-22", "course-23",
    ]);

    const completed = getMyCoursesPage(courses, "completed", 2);
    expect(completed.filteredCourses.map((course) => course.id)).toEqual(["course-3"]);
    expect(completed.currentPage).toBe(1);
    expect(completed.courses.map((course) => course.id)).toEqual(["course-3"]);
  });

  it("shows pagination only for 11 or more filtered courses", () => {
    expect(getMyCoursesPage(makeCourses(10), "all", 1).showPagination).toBe(false);
    expect(getMyCoursesPage(makeCourses(11), "all", 1).showPagination).toBe(true);
    expect(getMyCoursesPage(makeCourses(11), "completed", 1).showPagination).toBe(false);
  });

  it("resets pages on tab changes and clamps when results shrink", () => {
    expect(
      myCoursesListReducer(
        { tab: "all", currentPage: 3 },
        { type: "tab", tab: "completed" },
      ),
    ).toEqual({ tab: "completed", currentPage: 1 });
    expect(getMyCoursesPage(makeCourses(4), "all", 9).currentPage).toBe(1);
  });

  it("provides filtered empty states with no pagination", () => {
    expect(getMyCoursesEmptyMessage("in-progress")).toMatch(/in progress/i);
    expect(getMyCoursesEmptyMessage("completed")).toMatch(/completed/i);
    expect(getMyCoursesPage([], "completed", 1).showPagination).toBe(false);
  });
});

describe("MyCoursesPagination", () => {
  it("supports Previous, Next, numbered navigation, and accessible boundaries", () => {
    const onPageChange = vi.fn();
    const middle = buttonsByLabel(
      MyCoursesPagination({ currentPage: 2, totalPages: 3, onPageChange }),
    );
    middle.get("Previous page").props.onClick();
    middle.get("Next page").props.onClick();
    middle.get("Go to page 3").props.onClick();
    expect(onPageChange.mock.calls).toEqual([[1], [3], [3]]);
    expect(middle.get("Go to page 2").props["aria-current"]).toBe("page");

    const first = buttonsByLabel(
      MyCoursesPagination({ currentPage: 1, totalPages: 3, onPageChange: vi.fn() }),
    );
    const last = buttonsByLabel(
      MyCoursesPagination({ currentPage: 3, totalPages: 3, onPageChange: vi.fn() }),
    );
    expect(first.get("Previous page").props.disabled).toBe(true);
    expect(last.get("Next page").props.disabled).toBe(true);
  });
});
