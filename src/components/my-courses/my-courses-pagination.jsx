"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function MyCoursesPagination({ currentPage, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      aria-label="My Courses pagination"
      className="mt-10 flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3 lg:justify-end"
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex h-10 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-body3 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {pages.map((page) => {
        const active = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex size-10 items-center justify-center rounded-lg border border-blue-500 bg-blue-500 text-body2 font-medium text-white"
                : "flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-body2 text-gray-700 transition-colors hover:bg-gray-100"
            }
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex h-10 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-body3 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
