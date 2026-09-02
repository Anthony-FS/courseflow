import { paginateItems } from "@/lib/pagination";
import { sortItems } from "@/lib/sorting";

const SORT_CONFIGS = {
  title: { type: "text", getValue: (assignment) => assignment.title },
  course: { type: "text", getValue: (assignment) => assignment.courseTitle },
  createdAt: { type: "date", getValue: (assignment) => assignment.created_at },
  updatedAt: { type: "date", getValue: (assignment) => assignment.updated_at },
};

export const ASSIGNMENT_SORT_OPTIONS = [
  {
    value: "title",
    label: "Assignment detail",
    ascendingLabel: "A-Z",
    descendingLabel: "Z-A",
  },
  {
    value: "course",
    label: "Course",
    ascendingLabel: "A-Z",
    descendingLabel: "Z-A",
  },
  {
    value: "createdAt",
    label: "Created date",
    ascendingLabel: "Oldest first",
    descendingLabel: "Newest first",
  },
  {
    value: "updatedAt",
    label: "Updated date",
    ascendingLabel: "Oldest first",
    descendingLabel: "Newest first",
  },
];

export function searchAdminAssignments(assignments, query = "") {
  const normalizedQuery = String(query).trim().toLowerCase();
  if (!normalizedQuery) return assignments;

  return assignments.filter((assignment) =>
    [
      assignment.title,
      assignment.courseTitle,
      assignment.lessonTitle,
      assignment.subLessonTitle,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function filterAdminAssignmentsByStatus(assignments, status = "all") {
  if (status === "active") {
    return assignments.filter((assignment) => assignment.is_active === true);
  }
  if (status === "inactive") {
    return assignments.filter((assignment) => assignment.is_active === false);
  }
  return assignments;
}

export function isAssignmentFilteredOutByStatus(status, isActive) {
  return (
    (status === "active" && isActive === false) ||
    (status === "inactive" && isActive === true)
  );
}

export function sortAdminAssignments(assignments, sortBy, sortDirection) {
  const config = SORT_CONFIGS[sortBy] ?? SORT_CONFIGS.updatedAt;
  return sortItems(assignments, {
    ...config,
    direction: sortDirection === "asc" ? "asc" : "desc",
  });
}

export function processAdminAssignments(
  assignments,
  {
    query = "",
    status = "all",
    sortBy = "updatedAt",
    sortDirection = "desc",
    page = 1,
    pageSize = 10,
  } = {},
) {
  const searched = searchAdminAssignments(assignments, query);
  const filtered = filterAdminAssignmentsByStatus(searched, status);
  const sorted = sortAdminAssignments(filtered, sortBy, sortDirection);

  return {
    assignments: paginateItems(sorted, page, pageSize),
    total: sorted.length,
  };
}
