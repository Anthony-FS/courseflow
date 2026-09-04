"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { AssignmentTable } from "@/components/admin/assignment-table";
import { AdminPagination } from "@/components/admin/pagination";
import { CourseStatusFilter } from "@/components/admin/course-status-filter";
import { SortFilterBar } from "@/components/admin/sort-filter-bar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  applyAdminAssignmentStatus,
  getAdminAssignmentsPage,
  updateAdminAssignmentStatus,
} from "@/lib/admin-assignments";
import {
  ASSIGNMENT_SORT_OPTIONS,
  isAssignmentFilteredOutByStatus,
} from "@/lib/admin-assignment-list";
import { ITEMS_PER_PAGE, getTotalPages } from "@/lib/pagination";

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusToggle, setStatusToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [togglingAssignmentId, setTogglingAssignmentId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => loadAssignments(), 250);

    async function loadAssignments() {
      try {
        setStatus("loading");
        const data = await getAdminAssignmentsPage({
          query,
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          sortBy,
          sortDirection,
          status: statusFilter,
        });

        if (!cancelled) {
          setAssignments(data.assignments ?? []);
          setTotal(data.total ?? 0);
          setStatus("ready");
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            error.message ?? "Failed to load assignments.",
          );
        }
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, currentPage, sortBy, sortDirection, statusFilter]);

  const totalPages = getTotalPages(total, ITEMS_PER_PAGE);

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(nextStatus) {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
  }

  function handleSortChange({ sortBy: nextSortBy, sortDirection: nextDirection }) {
    setSortBy(nextSortBy);
    setSortDirection(nextDirection);
    setCurrentPage(1);
  }

  function handleToggleStatus(assignment) {
    setStatusToggle({
      assignment,
      nextActive: assignment.is_active === false,
    });
    setErrorMessage("");
  }

  async function handleConfirmStatusToggle() {
    if (!statusToggle || isToggling) return;

    const { assignment, nextActive } = statusToggle;
    setIsToggling(true);
    setTogglingAssignmentId(assignment.id);
    setErrorMessage("");

    try {
      const result = await updateAdminAssignmentStatus(
        assignment.id,
        nextActive,
      );
      const filteredOut = isAssignmentFilteredOutByStatus(
        statusFilter,
        result.is_active,
      );

      setAssignments((current) => {
        const updated = applyAdminAssignmentStatus(current, result);
        return filteredOut
          ? updated.filter((row) => row.id !== assignment.id)
          : updated;
      });
      if (filteredOut) {
        setTotal((current) => Math.max(0, current - 1));
      }
      setStatusToggle(null);
    } catch (error) {
      setErrorMessage(
        error.message ?? "Failed to update assignment status.",
      );
    } finally {
      setIsToggling(false);
      setTogglingAssignmentId("");
    }
  }

  const activating = statusToggle?.nextActive === true;

  return (
    <main className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">Assignments</h1>

        <div className="flex flex-wrap items-center gap-4">
          <label className="relative block">
            <span className="sr-only">Search assignments</span>
            <input
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

          <CourseStatusFilter
            value={statusFilter}
            onChange={handleStatusFilterChange}
            ariaLabel="Filter assignments by status"
          />

          <SortFilterBar
            options={ASSIGNMENT_SORT_OPTIONS}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />

          <Button asChild className="min-h-12 gap-2 px-6 py-3">
            <Link href="/admin/assignments/new">
              <Plus aria-hidden="true" className="size-5" />
              Add Assignment
            </Link>
          </Button>
        </div>
      </header>

      <section className="p-10">
        {errorMessage ? (
          <p
            className="mb-4 text-body2 text-orange-500"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card">
          <AssignmentTable
            assignments={assignments}
            isLoading={status === "loading"}
            onToggleStatus={handleToggleStatus}
            togglingAssignmentId={togglingAssignmentId}
          />
        </div>

        {status === "ready" && total > 0 ? (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            label="Assignment pagination"
          />
        ) : null}
      </section>

      <ConfirmationDialog
        open={Boolean(statusToggle)}
        isConfirming={isToggling}
        confirmFirst={!activating}
        onOpenChange={(open) => {
          if (!open && !isToggling) setStatusToggle(null);
        }}
        onConfirm={handleConfirmStatusToggle}
        title="Confirmation"
        message={
          activating
            ? `Activate assignment "${statusToggle?.assignment?.title}"? It will be marked active.`
            : `Deactivate assignment "${statusToggle?.assignment?.title}"? It will be marked inactive.`
        }
        confirmText={activating ? "Yes, activate" : "Yes, deactivate"}
        confirmVariant={activating ? "default" : "danger"}
        cancelText="Cancel"
        confirmingText="Updating..."
      />
    </main>
  );
}
