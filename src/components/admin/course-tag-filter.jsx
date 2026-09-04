"use client";

import { ChevronDown } from "lucide-react";

export function CourseTagFilter({
  value = "all",
  options = [],
  onChange,
  disabled = false,
}) {
  return (
    <label className="flex items-center gap-2 text-body3 text-gray-700">
      <span>Tag</span>
      <span className="relative block">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-12 min-w-48 appearance-none rounded-lg border border-gray-400 bg-white px-3 pr-10 text-body2 outline-none focus:border-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Filter by tag"
        >
          <option value="all">All tags</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-600"
        />
      </span>
    </label>
  );
}
