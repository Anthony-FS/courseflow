"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";

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

export function MemberAssignmentTable({ assignments = [] }) {
  const [query, setQuery] = useState("");
  const filteredAssignments = useMemo(
    () => assignments.filter((assignment) => matchesSearch(assignment, query)),
    [assignments, query],
  );

  return (
    <section aria-label="My assignment list">
      <div className="mb-6 flex justify-end">
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Search assignments</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                    No assignments match your search.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => (
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
    </section>
  );
}

export { matchesSearch };
