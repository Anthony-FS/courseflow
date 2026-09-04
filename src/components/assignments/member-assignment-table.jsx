"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useReducer } from "react";

import {
  MEMBER_ASSIGNMENT_STATUS_OPTIONS,
  MemberAssignmentSelectFilter,
} from "@/components/assignments/member-assignment-filters";
import { MemberAssignmentPagination } from "@/components/assignments/member-assignment-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ITEMS_PER_PAGE,
  getTotalPages,
  paginateItems,
} from "@/lib/pagination";

const INITIAL_LIST_STATE = {
  query: "",
  courseId: "all",
  status: "all",
  currentPage: 1,
};

function matchesSearch(assignment, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    assignment.title,
    assignment.courseTitle,
    assignment.lessonTitle,
    assignment.subLessonTitle,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function matchesCourse(assignment, courseId) {
  if (!courseId || courseId === "all") return true;
  return assignment.courseId === courseId;
}

function matchesStatus(assignment, status) {
  if (!status || status === "all") return true;
  return assignment.status === status;
}

export function uniqueMemberAssignmentCourses(assignments) {
  const courses = new Map();

  for (const assignment of assignments ?? []) {
    const courseId = assignment?.courseId;
    if (!courseId || courses.has(courseId)) continue;
    courses.set(courseId, {
      value: courseId,
      label: assignment.courseTitle || "Untitled course",
    });
  }

  return [...courses.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function memberAssignmentListReducer(state, action) {
  if (action.type === "search") {
    return { ...state, query: action.query, currentPage: 1 };
  }
  if (action.type === "course") {
    return { ...state, courseId: action.courseId, currentPage: 1 };
  }
  if (action.type === "status") {
    return { ...state, status: action.status, currentPage: 1 };
  }
  if (action.type === "page") {
    return { ...state, currentPage: action.page };
  }
  if (action.type === "clamp") {
    return { ...state, currentPage: Math.min(state.currentPage, action.totalPages) };
  }
  return state;
}

export function getMemberAssignmentPage(
  assignments,
  query,
  currentPage,
  pageSize = ITEMS_PER_PAGE,
  { courseId = "all", status = "all" } = {},
) {
  const filteredAssignments = assignments.filter(
    (assignment) =>
      matchesSearch(assignment, query) &&
      matchesCourse(assignment, courseId) &&
      matchesStatus(assignment, status),
  );
  const totalPages = getTotalPages(filteredAssignments.length, pageSize);
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  return {
    filteredAssignments,
    assignments: paginateItems(filteredAssignments, validPage, pageSize),
    currentPage: validPage,
    totalPages,
  };
}

export function MemberAssignmentTable({ assignments = [] }) {
  const [state, dispatch] = useReducer(
    memberAssignmentListReducer,
    INITIAL_LIST_STATE,
  );
  const courseOptions = useMemo(
    () => uniqueMemberAssignmentCourses(assignments),
    [assignments],
  );
  const page = useMemo(
    () =>
      getMemberAssignmentPage(assignments, state.query, state.currentPage, ITEMS_PER_PAGE, {
        courseId: state.courseId,
        status: state.status,
      }),
    [assignments, state.query, state.courseId, state.status, state.currentPage],
  );

  useEffect(() => {
    if (state.currentPage !== page.currentPage) {
      dispatch({ type: "clamp", totalPages: page.totalPages });
    }
  }, [page.currentPage, page.totalPages, state.currentPage]);

  return (
    <section aria-label="My assignment list">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
        <MemberAssignmentSelectFilter
          label="Course"
          value={state.courseId}
          options={courseOptions}
          allOptionLabel="All courses"
          ariaLabel="Filter by course"
          onChange={(courseId) => dispatch({ type: "course", courseId })}
        />
        <MemberAssignmentSelectFilter
          label="Status"
          value={state.status}
          options={MEMBER_ASSIGNMENT_STATUS_OPTIONS}
          allOptionLabel="All status"
          ariaLabel="Filter by status"
          onChange={(status) => dispatch({ type: "status", status })}
        />
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Search assignments</span>
          <input
            type="search"
            value={state.query}
            onChange={(event) =>
              dispatch({ type: "search", query: event.target.value })
            }
            placeholder="Search assignments..."
            className="h-12 min-h-12 w-full rounded-lg border border-gray-400 bg-white px-4 pr-11 text-body2"
          />
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-gray-600"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead className="bg-gray-100 text-body3 text-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Assignment detail
                </th>
                <th scope="col" className="px-6 py-3 font-medium">Course</th>
                <th scope="col" className="px-6 py-3 font-medium">Lesson</th>
                <th scope="col" className="px-6 py-3 font-medium">Sub-lesson</th>
                <th scope="col" className="px-6 py-3 font-medium">Status</th>
                <th scope="col" className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>

            <tbody className="text-body2 text-gray-800">
              {page.filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                    No assignments match your filters.
                  </td>
                </tr>
              ) : (
                page.assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-t border-gray-300">
                    <td className="px-6 py-4">{assignment.title}</td>
                    <td className="px-6 py-4">{assignment.courseTitle}</td>
                    <td className="px-6 py-4">{assignment.lessonTitle}</td>
                    <td className="px-6 py-4">{assignment.subLessonTitle}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={assignment.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={assignment.href}
                        aria-label={`View ${assignment.title}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 font-medium text-blue-500 transition-colors hover:bg-blue-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {page.filteredAssignments.length > ITEMS_PER_PAGE ? (
        <MemberAssignmentPagination
          currentPage={page.currentPage}
          totalPages={page.totalPages}
          onPageChange={(nextPage) =>
            dispatch({ type: "page", page: nextPage })
          }
        />
      ) : null}
    </section>
  );
}

export { matchesSearch };
