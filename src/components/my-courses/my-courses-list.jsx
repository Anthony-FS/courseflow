"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, RefreshCw } from "lucide-react";

import { MyCourseCard } from "@/components/my-courses/my-course-card";
import { MyCoursesPagination } from "@/components/my-courses/my-courses-pagination";
import { MyCoursesProfileCard } from "@/components/my-courses/my-courses-profile-card";
import { loadMyCourses } from "@/lib/enrollments";
import {
  MY_COURSES_TABS,
  getMyCoursesEmptyMessage,
  getMyCoursesPage,
  getMyCoursesSummary,
  myCoursesListReducer,
} from "@/lib/my-courses";

export function MyCoursesList({ member }) {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [listState, dispatch] = useReducer(myCoursesListReducer, {
    tab: "all",
    currentPage: 1,
  });

  async function loadCourses() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const loadedCourses = await loadMyCourses();
      setCourses(loadedCourses);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error.message || "Failed to load your courses.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let ignore = false;

    loadMyCourses()
      .then((loadedCourses) => {
        if (ignore) return;
        setCourses(loadedCourses);
        setStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setErrorMessage(error.message || "Failed to load your courses.");
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const summary = getMyCoursesSummary(courses);
  const page = getMyCoursesPage(courses, listState.tab, listState.currentPage);

  useEffect(() => {
    if (page.currentPage !== listState.currentPage) {
      dispatch({ type: "page", page: page.currentPage });
    }
  }, [listState.currentPage, page.currentPage]);

  if (status === "loading") {
    return (
      <div
        className="mt-12 flex items-center justify-center gap-3 text-body2 text-gray-700"
        role="status"
      >
        <Loader2 className="size-5 animate-spin text-blue-500" aria-hidden />
        Loading your courses...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center"
        role="alert"
      >
        <p className="text-body2 text-orange-600">{errorMessage}</p>
        <button
          type="button"
          onClick={loadCourses}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 font-medium text-white shadow-button transition duration-200 hover:bg-blue-400"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try Again
        </button>
      </div>
    );
  }

  const emptyMessage = getMyCoursesEmptyMessage(listState.tab);

  return (
    <section
      className="mt-10 grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"
      aria-label="Your learning"
    >
      <MyCoursesProfileCard
        member={member}
        inProgress={summary.inProgress}
        completed={summary.completed}
      />

      <div className="min-w-0">
        <div
          className="flex max-w-full gap-1 overflow-x-auto border-b border-gray-300"
          role="tablist"
          aria-label="Filter courses"
        >
          {MY_COURSES_TABS.map((tab) => {
            const selected = listState.tab === tab.id;
            const count =
              tab.id === "all"
                ? courses.length
                : tab.id === "completed"
                  ? summary.completed
                  : summary.inProgress;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => dispatch({ type: "tab", tab: tab.id })}
                className={
                  selected
                    ? "shrink-0 border-b-2 border-blue-500 px-4 py-3 text-body2 font-medium text-blue-500"
                    : "shrink-0 border-b-2 border-transparent px-4 py-3 text-body2 text-gray-700 transition-colors hover:text-blue-500"
                }
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {courses.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card sm:p-10">
            <div className="grid size-16 place-items-center rounded-full bg-blue-100 text-blue-500">
              <BookOpen className="size-8" aria-hidden />
            </div>
            <h2 className="mt-4 text-headline3 font-medium text-black">
              You haven’t enrolled in any courses yet.
            </h2>
            <p className="mt-2 text-body2 text-gray-700">
              Browse our catalog and choose a course to start learning.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-blue-500 px-6 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
            >
              Explore Courses
            </Link>
          </div>
        ) : page.filteredCourses.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card">
            <BookOpen className="mx-auto size-10 text-blue-400" aria-hidden />
            <p className="mt-4 text-headline3 font-medium text-black">
              {emptyMessage}
            </p>
            <p className="mt-2 text-body3 text-gray-700">
              Keep learning and your courses will appear here.
            </p>
          </div>
        ) : (
          <ul
            className="mt-8 grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2"
            aria-label="Enrolled courses"
          >
            {page.courses.map((course) => (
              <li key={course.enrollmentId || course.id} className="min-w-0">
                <MyCourseCard course={course} />
              </li>
            ))}
          </ul>
        )}

        {page.showPagination ? (
          <MyCoursesPagination
            currentPage={page.currentPage}
            totalPages={page.totalPages}
            onPageChange={(nextPage) =>
              dispatch({ type: "page", page: nextPage })
            }
          />
        ) : null}
      </div>
    </section>
  );
}
