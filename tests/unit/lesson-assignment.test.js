import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LessonAssignment } from "@/components/course-learn/lesson-assignment";

describe("LessonAssignment", () => {
  it("renders the existing assignment submission card", () => {
    const onSubmitted = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(LessonAssignment, {
        assignment: {
          id: "assignment-1",
          title: "Research reflection",
          description: "Describe what you learned.",
          submissionType: "text",
        },
        submission: null,
        courseId: "course-1",
        subLessonId: "sub-lesson-1",
        onSubmitted,
      }),
    );

    expect(html).toContain("Assignment");
    expect(html).toContain("Research reflection");
    expect(html).toContain("Send Assignment");
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
