"use client";

import { cn } from "@/lib/utils";

export const COURSE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function CourseStatusFilter({
  value = "all",
  onChange,
  className,
  ariaLabel = "Filter by status",
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-12 items-center rounded-lg border border-gray-400 bg-white p-1",
        className,
      )}
    >
      {COURSE_STATUS_FILTER_OPTIONS.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "h-10 rounded-md px-4 text-body3 font-medium transition-colors",
              isSelected
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
