"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { AssignmentTable } from "@/components/admin/assignment-table";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { deleteAdminAssignment, getAdminAssignmentsPage } from "@/lib/admin-assignments";
import { ITEMS_PER_PAGE, getTotalPages } from "@/lib/pagination";

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [query, currentPage]);

  const totalPages = getTotalPages(total, ITEMS_PER_PAGE);

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
  }

  function handleDeleteRequest(assignment) {
    setAssignmentToDelete(assignment);
    setErrorMessage("");
  }

  function handleDeleteCancel() {
    if (!isDeleting) {
      setAssignmentToDelete(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!assignmentToDelete || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteAdminAssignment(assignmentToDelete.id);

      setAssignments((current) =>
        current.filter(
          (assignment) => assignment.id !== assignmentToDelete.id,
        ),
      );
      const nextTotal = Math.max(0, total - 1);
      setTotal(nextTotal);
      setCurrentPage((page) => Math.min(page, getTotalPages(nextTotal, ITEMS_PER_PAGE)));

      setAssignmentToDelete(null);
      setCurrentPage(1);
    } catch (error) {
      setErrorMessage(
        error.message ?? "Failed to delete assignment.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

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
            onDelete={handleDeleteRequest}
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
        open={Boolean(assignmentToDelete)}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete assignment"
        message={
          assignmentToDelete
            ? `Are you sure you want to delete "${assignmentToDelete.title}"?`
            : ""
        }
        confirmText="Yes, delete assignment"
        cancelText="No, keep it"
        isConfirming={isDeleting}
        confirmingText="Deleting..."
        confirmFirst
      />
    </main>
  );
}
