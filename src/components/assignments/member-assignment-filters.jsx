"use client";

import { ChevronDown } from "lucide-react";

export const MEMBER_ASSIGNMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
];

export function MemberAssignmentSelectFilter({
  label,
  value = "all",
  options = [],
  onChange,
  allOptionLabel,
  ariaLabel,
}) {
  return (
    <label className="flex items-center gap-2 text-body3 text-gray-700">
      <span>{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-12 min-w-48 appearance-none rounded-lg border border-gray-400 bg-white px-3 pr-10 text-body2 outline-none focus:border-orange-100"
          aria-label={ariaLabel || `Filter by ${label}`}
        >
          <option value="all">{allOptionLabel}</option>
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
  );
}
