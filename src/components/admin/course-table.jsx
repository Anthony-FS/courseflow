"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Power, PowerOff, SquarePen } from "lucide-react";

import { FALLBACK_COVER } from "@/lib/courses";
import { formatCourseDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function CourseCover({ src, alt }) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_COVER);

  useEffect(() => {
    setImageSrc(src || FALLBACK_COVER);
  }, [src]);

  return (
    <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded">
      <Image
        src={imageSrc}
        alt={alt}
        fill
        sizes="56px"
        className="object-cover"
        unoptimized
        onError={() => {
          if (imageSrc !== FALLBACK_COVER) {
            setImageSrc(FALLBACK_COVER);
          }
        }}
      />
    </div>
  );
}

function CourseStatusBadge({ isActive }) {
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

function ActionIconButton({
  label,
  disabled = false,
  className,
  onClick,
  children,
}) {
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

export function CourseTable({
  courses,
  isLoading = false,
  onToggleStatus,
  togglingCourseId = "",
  rowOffset = 0,
}) {
  const emptyMessage = isLoading ? "Loading courses..." : "No courses found.";

  return (
    <TooltipProvider>
      <section className="overflow-x-auto bg-white">
        <table className="w-full min-w-5xl border-collapse text-left">
          <thead className="bg-gray-100 text-body3 text-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">
                #
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Image
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Course code
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Course name
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Tag
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Lesson
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Price
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Created date
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Updated date
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-body2 text-gray-800">
            {courses.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-10 text-center text-gray-600">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              courses.map((course, index) => {
                const isActive = course.is_active !== false;
                const isToggling = togglingCourseId === course.id;
                const toggleLabel = isActive
                  ? `Deactivate ${course.title}`
                  : `Activate ${course.title}`;

                return (
                  <tr key={course.id} className="border-t border-gray-300">
                    <td className="px-6 py-4">{rowOffset + index + 1}</td>
                    <td className="px-6 py-4">
                      <CourseCover
                        src={course.cover_file_url}
                        alt={course.title || "Course cover"}
                      />
                    </td>
                    <td className="px-6 py-4">{course.course_code || "-"}</td>
                    <td className="max-w-60 truncate px-6 py-4" title={course.title}>
                      {course.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {course.tag_name || course.tag || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {course.lesson_count} Lessons
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatPrice(course.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCourseDate(course.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCourseDate(course.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      <CourseStatusBadge isActive={isActive} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/admin/courses/${course.id}/edit`}
                              aria-label={`Edit ${course.title}`}
                              className="inline-flex size-10 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-100"
                            >
                              <SquarePen aria-hidden="true" className="size-5" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Edit course</TooltipContent>
                        </Tooltip>

                        <ActionIconButton
                          label={toggleLabel}
                          disabled={isToggling}
                          onClick={() => onToggleStatus(course)}
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
