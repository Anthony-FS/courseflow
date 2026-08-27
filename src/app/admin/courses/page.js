"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { CourseTable } from "@/components/admin/course-table";
import { AdminPagination } from "@/components/admin/pagination";
import { SortFilterBar } from "@/components/admin/sort-filter-bar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { deleteCourse } from "@/lib/courses";
import { getAdminCoursesPage } from "@/lib/admin-courses";
import { ITEMS_PER_PAGE, getTotalPages } from "@/lib/pagination";

const COURSE_SORT_OPTIONS = [
  {
    value: "courseCode",
    label: "Course code",
    ascendingLabel: "A-Z",
    descendingLabel: "Z-A",
  },
  {
    value: "title",
    label: "Course name",
    ascendingLabel: "A-Z",
    descendingLabel: "Z-A",
  },
  {
    value: "price",
    label: "Price",
    ascendingLabel: "Low to high",
    descendingLabel: "High to low",
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

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("courseCode");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      loadCourses();
    }, 250);

    async function loadCourses() {
      try {
        setStatus("loading");
        const data = await getAdminCoursesPage({
          query,
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          sortBy,
          sortDirection,
        });

        if (!cancelled) {
          setCourses(data.courses ?? []);
          setTotal(data.total ?? 0);
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

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, currentPage, sortBy, sortDirection]);

  const totalPages = getTotalPages(total, ITEMS_PER_PAGE);

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
  }

  function handleSortChange({ sortBy: nextSortBy, sortDirection: nextDirection }) {
    setSortBy(nextSortBy);
    setSortDirection(nextDirection);
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
      const nextTotal = Math.max(0, total - 1);
      setTotal(nextTotal);
      setCurrentPage((page) => Math.min(page, getTotalPages(nextTotal, ITEMS_PER_PAGE)));
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
          <SortFilterBar
            options={COURSE_SORT_OPTIONS}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
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
            courses={courses}
            isLoading={status === "loading"}
            onDelete={setCourseToDelete}
            rowOffset={(currentPage - 1) * ITEMS_PER_PAGE}
          />
        </div>

        {status === "ready" && total > 0 ? (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            label="Course pagination"
          />
        ) : null}
      </section>

      <ConfirmationDialog
        open={Boolean(courseToDelete)}
        isConfirming={isDeleting}
        confirmFirst
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setCourseToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        message="Are you sure you want to delete this course?"
        confirmText="Yes, I want to delete this course"
        cancelText="No, keep it"
      />
    </main>
  );
}
