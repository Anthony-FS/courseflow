import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MemberAssignmentEmptyState,
  MemberAssignmentErrorState,
} from "@/components/assignments/member-assignment-states";
import { matchesSearch } from "@/components/assignments/member-assignment-table";

const assignment = {
  title: "Research reflection",
  courseTitle: "Service Design",
  lessonTitle: "User Research",
  subLessonTitle: "Interviews",
};

describe("member assignment page states", () => {
  it("renders the no-enrolled-courses state", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberAssignmentEmptyState, { type: "no-enrollments" }),
    );

    expect(html).toContain("You haven’t enrolled in any courses yet.");
    expect(html).toContain("Explore Courses");
    expect(html).toContain('href="/courses"');
  });

  it("renders the enrolled-with-no-assignments state", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberAssignmentEmptyState, { type: "no-assignments" }),
    );

    expect(html).toContain("You don’t have any assignments yet.");
    expect(html).toContain(
      "Assignments from your enrolled courses will appear here.",
    );
  });

  it("renders the unexpected-query-error state", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberAssignmentErrorState),
    );

    expect(html).toContain("We couldn’t load your assignments.");
    expect(html).toContain('role="alert"');
  });

  it("searches assignment, course, lesson, and sub-lesson text", () => {
    expect(matchesSearch(assignment, "reflection")).toBe(true);
    expect(matchesSearch(assignment, "service design")).toBe(true);
    expect(matchesSearch(assignment, "user research")).toBe(true);
    expect(matchesSearch(assignment, "interviews")).toBe(true);
    expect(matchesSearch(assignment, "programming")).toBe(false);
  });
});
