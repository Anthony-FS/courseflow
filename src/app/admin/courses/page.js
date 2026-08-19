"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { CourseTable } from "@/components/admin/course-table";
import { DeleteCourseDialog } from "@/components/admin/delete-course-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { deleteCourse, getCourses, searchCourses } from "@/lib/courses";
import {
  ITEMS_PER_PAGE,
  getTotalPages,
  paginateItems,
} from "@/lib/pagination";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const data = await getCourses();

        if (!cancelled) {
          setCourses(data);
          setStatus("ready");
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(error.message ?? "Failed to load courses.");
        }
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCourses = useMemo(
    () => searchCourses(courses, query),
    [courses, query],
  );

  const totalPages = getTotalPages(visibleCourses.length);

  const paginatedCourses = useMemo(
    () => paginateItems(visibleCourses, currentPage),
    [visibleCourses, currentPage],
  );

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
  }

  async function handleConfirmDelete() {
    if (!courseToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteCourse(courseToDelete.id);
      const remaining = courses.filter(
        (course) => course.id !== courseToDelete.id,
      );

      setCourses(remaining);
      setCurrentPage((page) =>
        Math.min(page, getTotalPages(searchCourses(remaining, query).length)),
      );
      setCourseToDelete(null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message ?? "Failed to delete this course.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">Course</h1>
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative block">
            <span className="sr-only">Search courses</span>
            <input
              data-slot="input"
              type="search"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="h-12 min-h-12 w-80 rounded-lg border border-gray-400 bg-white px-4 pr-11 text-body2"
            />
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-gray-600"
            />
          </label>
          <Button asChild className="min-h-12 gap-2 px-6 py-3">
            <Link href="/admin/courses/new">
              <Plus aria-hidden="true" className="size-5" />
              Add Course
            </Link>
          </Button>
        </div>
      </header>

      <section className="p-10">
        {errorMessage ? (
          <p className="mb-4 text-body2 text-orange-500" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card">
          <CourseTable
            courses={paginatedCourses}
            isLoading={status === "loading"}
            onDelete={setCourseToDelete}
            rowOffset={(currentPage - 1) * ITEMS_PER_PAGE}
          />
        </div>

        {status === "ready" && visibleCourses.length > 0 ? (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            label="Course pagination"
          />
        ) : null}
      </section>

      <DeleteCourseDialog
        open={Boolean(courseToDelete)}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setCourseToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}
