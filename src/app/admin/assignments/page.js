"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { AssignmentTable } from "@/components/admin/assignment-table";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { getAssignments, searchAssignments } from "@/lib/assignments";
import { getTotalPages, paginateItems } from "@/lib/pagination";

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      try {
        const data = await getAssignments();

        if (!cancelled) {
          setAssignments(data);
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

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAssignments = useMemo(
    () => searchAssignments(assignments, query),
    [assignments, query],
  );

  const totalPages = getTotalPages(visibleAssignments.length);

  const paginatedAssignments = useMemo(
    () => paginateItems(visibleAssignments, currentPage),
    [visibleAssignments, currentPage],
  );

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
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
          <p className="mb-4 text-body2 text-orange-500" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card">
          <AssignmentTable
            assignments={paginatedAssignments}
            isLoading={status === "loading"}
          />
        </div>

        {status === "ready" && visibleAssignments.length > 0 ? (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            label="Assignment pagination"
          />
        ) : null}
      </section>
    </main>
  );
}