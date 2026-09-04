"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";

export function SortFilterBar({
  options = [],
  sortBy,
  sortDirection = "asc",
  onSortChange,
  className = "",
}) {
  const selectedOption = options.find((option) => option.value === sortBy);
  const directionLabel = sortDirection === "desc"
    ? selectedOption?.descendingLabel ?? "Descending"
    : selectedOption?.ascendingLabel ?? "Ascending";

  function handleSortByChange(event) {
    onSortChange?.({
      sortBy: event.target.value,
      sortDirection: "asc",
    });
  }

  function toggleDirection() {
    onSortChange?.({
      sortBy,
      sortDirection: sortDirection === "asc" ? "desc" : "asc",
    });
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label className="flex items-center gap-2 text-body3 text-gray-700">
        <span>Sort by</span>
        <span className="relative block">
          <select
            value={sortBy ?? ""}
            onChange={handleSortByChange}
            className="h-12 min-w-48 appearance-none rounded-lg border border-gray-400 bg-white px-3 pr-10 text-body2 outline-none focus:border-orange-100"
            aria-label="Sort by"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-600"
          />
        </span>
      </label>

      <button
        type="button"
        onClick={toggleDirection}
        disabled={!selectedOption}
        className="inline-flex size-12 items-center justify-center rounded-lg border border-gray-400 bg-white text-gray-700 outline-none hover:border-orange-100 focus:border-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Sort ${directionLabel}`}
        title={directionLabel}
      >
        <ArrowUpDown aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
