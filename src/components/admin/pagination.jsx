"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
  label,
  disabled = false,
}) {
  function goToPreviousPage() {
    if (disabled) return;
    onPageChange(Math.max(1, currentPage - 1));
  }

  function goToNextPage() {
    if (disabled) return;
    onPageChange(Math.min(totalPages, currentPage + 1));
  }

  return (
    <nav
      aria-label={label}
      className="mt-6 flex items-center justify-end gap-3"
    >
      <button
        type="button"
        onClick={goToPreviousPage}
        disabled={disabled || currentPage === 1}
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-5" />
      </button>

      <span className="text-body2 text-gray-700">
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={goToNextPage}
        disabled={disabled || currentPage === totalPages}
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="size-5" />
      </button>
    </nav>
  );
}
