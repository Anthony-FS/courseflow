import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AssignmentTable } from "@/components/admin/assignment-table";
import {
  ADMIN_ASSIGNMENT_COLUMNS,
  mapAdminAssignment,
} from "@/app/api/admin/assignments/route";
import { formatCourseDate } from "@/lib/format";

const ASSIGNMENT = {
  id: "assignment-1",
  title: "Research reflection",
  courseTitle: "Service Design",
  lessonTitle: "Research",
  subLessonTitle: "Interviews",
  createdDateLabel: "02/09/2026 4:30PM",
  updatedDateLabel: "03/09/2026 5:45PM",
  is_active: true,
};

function visitElements(node, visitor) {
  if (!React.isValidElement(node)) return;
  visitor(node);
  React.Children.forEach(node.props.children, (child) =>
    visitElements(child, visitor),
  );
}

describe("Admin Assignment list mapping", () => {
  it("selects and formats real assignment metadata", () => {
    const row = {
      id: "assignment-1",
      title: "Research reflection",
      description: null,
      created_at: "2026-09-02T09:30:00Z",
      updated_at: "2026-09-03T10:45:00Z",
      is_active: false,
      course: { title: "Service Design" },
      subLesson: {
        title: "Interviews",
        lesson: { title: "Research" },
      },
    };

    expect(ADMIN_ASSIGNMENT_COLUMNS).toMatch(/created_at/);
    expect(ADMIN_ASSIGNMENT_COLUMNS).toMatch(/updated_at/);
    expect(ADMIN_ASSIGNMENT_COLUMNS).toMatch(/is_active/);
    expect(ADMIN_ASSIGNMENT_COLUMNS).not.toMatch(/start_at/);
    expect(mapAdminAssignment(row)).toMatchObject({
      createdDateLabel: formatCourseDate(row.created_at),
      updatedDateLabel: formatCourseDate(row.updated_at),
      is_active: false,
    });
  });

  it("uses the project fallback only for missing timestamps", () => {
    const mapped = mapAdminAssignment({
      id: "assignment-1",
      title: "Reflection",
      created_at: null,
      updated_at: null,
      is_active: true,
    });

    expect(mapped.createdDateLabel).toBe("-");
    expect(mapped.updatedDateLabel).toBe("-");
  });
});

describe("AssignmentTable", () => {
  it("renders dates, Active and Inactive badges, and the edit action", () => {
    const html = renderToStaticMarkup(
      React.createElement(AssignmentTable, {
        assignments: [ASSIGNMENT, { ...ASSIGNMENT, id: "assignment-2", is_active: false }],
      }),
    );

    expect(html).toContain(ASSIGNMENT.createdDateLabel);
    expect(html).toContain(ASSIGNMENT.updatedDateLabel);
    expect(html).toContain("Active");
    expect(html).toContain("Inactive");
    expect(html).toContain('href="/admin/assignments/assignment-1/edit"');
    expect(html).toContain('aria-label="Edit Research reflection"');
    expect(html).toContain("lucide-square-pen");
    expect(html).not.toContain("lucide-trash-2");
    expect(html).not.toContain("Delete assignment");
  });

  it("uses accessible toggle labels and preserves the toggle callback", () => {
    const onToggleStatus = vi.fn();
    const tree = AssignmentTable({
      assignments: [ASSIGNMENT, { ...ASSIGNMENT, id: "assignment-2", is_active: false }],
      onToggleStatus,
    });
    const actions = [];
    const tooltipLabels = [];

    visitElements(tree, (element) => {
      if (element.props.label?.startsWith("Deactivate ") || element.props.label?.startsWith("Activate ")) {
        actions.push(element);
      }
      if (typeof element.props.children === "string") {
        tooltipLabels.push(element.props.children);
      }
    });

    const deactivate = actions.find(
      (action) => action.props.label === "Deactivate Research reflection",
    );
    const activate = actions.find(
      (action) => action.props.label === "Activate Research reflection",
    );

    expect(tooltipLabels).toContain("Edit assignment");
    expect(deactivate).toBeDefined();
    expect(activate).toBeDefined();
    deactivate.props.onClick();
    expect(onToggleStatus).toHaveBeenCalledWith(ASSIGNMENT);
  });

  it("shows a disabled loading action and preserves loading/empty states", () => {
    const togglingHtml = renderToStaticMarkup(
      React.createElement(AssignmentTable, {
        assignments: [ASSIGNMENT],
        togglingAssignmentId: ASSIGNMENT.id,
      }),
    );
    const loadingHtml = renderToStaticMarkup(
      React.createElement(AssignmentTable, { isLoading: true }),
    );
    const emptyHtml = renderToStaticMarkup(
      React.createElement(AssignmentTable, { isLoading: false }),
    );

    expect(togglingHtml).toContain("lucide-loader-circle");
    expect(togglingHtml).toContain("disabled");
    expect(loadingHtml).toContain("Loading assignments...");
    expect(emptyHtml).toContain("No assignments found.");
    expect(loadingHtml).toContain('colSpan="8"');
  });
});
