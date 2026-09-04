import { ITEMS_PER_PAGE, getTotalPages, paginateItems } from "@/lib/pagination";

export const MY_COURSES_TABS = [
  { id: "all", label: "All Courses" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

export function clampCourseProgress(progress) {
  const value = Number(progress);
  return Math.min(100, Math.max(0, Number.isFinite(value) ? Math.round(value) : 0));
}

export function courseProgress(course) {
  return clampCourseProgress(course?.progress);
}

export function filterMyCourses(courses, tab) {
  const list = Array.isArray(courses) ? courses : [];

  if (tab === "completed") {
    return list.filter((course) => courseProgress(course) === 100);
  }

  if (tab === "in-progress") {
    return list.filter((course) => courseProgress(course) < 100);
  }

  return list.slice();
}

export function getMyCoursesSummary(courses) {
  const list = Array.isArray(courses) ? courses : [];
  return {
    inProgress: list.filter((course) => courseProgress(course) < 100).length,
    completed: list.filter((course) => courseProgress(course) === 100).length,
  };
}

export function getMyCoursesEmptyMessage(tab) {
  return tab === "completed"
    ? "You haven’t completed any courses yet."
    : "You don’t have any courses in progress.";
}

export function getMyCoursesPage(
  courses,
  tab = "all",
  requestedPage = 1,
  pageSize = ITEMS_PER_PAGE,
) {
  const filteredCourses = filterMyCourses(courses, tab);
  const totalPages = getTotalPages(filteredCourses.length, pageSize);
  const numericPage = Number(requestedPage);
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number.isFinite(numericPage) ? Math.trunc(numericPage) : 1),
  );

  return {
    filteredCourses,
    courses: paginateItems(filteredCourses, currentPage, pageSize),
    currentPage,
    totalPages,
    showPagination: filteredCourses.length > pageSize,
  };
}

export function myCoursesListReducer(state, action) {
  if (action.type === "tab") {
    return { tab: action.tab, currentPage: 1 };
  }

  if (action.type === "page") {
    return { ...state, currentPage: action.page };
  }

  return state;
}
