"use client";

import Link from "next/link";
import { Loader2, Power, PowerOff, SquarePen } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function AssignmentStatusBadge({ isActive }) {
  return (
    <span
      className={cn(
        "ds-status",
        isActive ? "bg-status-submitted text-green" : "bg-gray-100 text-gray-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isActive ? "bg-green" : "bg-gray-600",
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function ActionIconButton({ label, disabled, className, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          onClick={onClick}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AssignmentTable({
  assignments = [],
  isLoading = false,
  onToggleStatus,
  togglingAssignmentId = "",
}) {
  const emptyMessage = isLoading
    ? "Loading assignments..."
    : "No assignments found.";

  return (
    <TooltipProvider>
      <section className="overflow-x-auto bg-white">
        <table className="w-full min-w-5xl border-collapse text-left">
          <thead className="bg-gray-100 text-body3 text-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">
                Assignment detail
              </th>
              <th scope="col" className="px-6 py-3 font-medium">Course</th>
              <th scope="col" className="px-6 py-3 font-medium">Lesson</th>
              <th scope="col" className="px-6 py-3 font-medium">Sub-lesson</th>
              <th scope="col" className="px-6 py-3 font-medium">Created date</th>
              <th scope="col" className="px-6 py-3 font-medium">Updated date</th>
              <th scope="col" className="px-6 py-3 font-medium">Status</th>
              <th scope="col" className="px-6 py-3 font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="text-body2 text-gray-800">
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-600">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => {
                const isActive = assignment.is_active !== false;
                const isToggling = togglingAssignmentId === assignment.id;
                const toggleLabel = isActive
                  ? `Deactivate ${assignment.title}`
                  : `Activate ${assignment.title}`;

                return (
                  <tr key={assignment.id} className="border-t border-gray-300">
                    <td className="px-6 py-4">{assignment.title}</td>
                    <td className="px-6 py-4">{assignment.courseTitle}</td>
                    <td className="px-6 py-4">{assignment.lessonTitle}</td>
                    <td className="px-6 py-4">{assignment.subLessonTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assignment.createdDateLabel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assignment.updatedDateLabel}
                    </td>
                    <td className="px-6 py-4">
                      <AssignmentStatusBadge isActive={isActive} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/admin/assignments/${assignment.id}/edit`}
                              aria-label={`Edit ${assignment.title}`}
                              className="inline-flex size-10 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-100"
                            >
                              <SquarePen aria-hidden="true" className="size-5" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Edit assignment</TooltipContent>
                        </Tooltip>

                        <ActionIconButton
                          label={toggleLabel}
                          disabled={isToggling}
                          onClick={() => onToggleStatus?.(assignment)}
                          className={
                            isActive
                              ? "text-red-500 hover:bg-red-100"
                              : "text-green hover:bg-status-submitted"
                          }
                        >
                          {isToggling ? (
                            <Loader2
                              aria-hidden="true"
                              className="size-5 animate-spin"
                            />
                          ) : isActive ? (
                            <PowerOff aria-hidden="true" className="size-5" />
                          ) : (
                            <Power aria-hidden="true" className="size-5" />
                          )}
                        </ActionIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </TooltipProvider>
  );
}
