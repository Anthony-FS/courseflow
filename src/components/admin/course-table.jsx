"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SquarePen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FALLBACK_COVER } from "@/lib/courses";
import { formatCourseDate, formatPrice } from "@/lib/format";

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

export function CourseTable({
  courses,
  isLoading = false,
  onDelete,
  rowOffset = 0,
}) {
  const emptyMessage = isLoading ? "Loading courses..." : "No courses found.";

  return (
    <section className="overflow-x-auto bg-white">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead className="bg-gray-100 text-body3 text-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              #
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Image
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Course name
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
              Action
            </th>
          </tr>
        </thead>
        <tbody className="text-body2 text-gray-800">
          {courses.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-10 text-center text-gray-600">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            courses.map((course, index) => (
              <tr key={course.id} className="border-t border-gray-300">
                <td className="px-6 py-4">{rowOffset + index + 1}</td>
                <td className="px-6 py-4">
                  <CourseCover
                    src={course.cover_file_url}
                    alt={course.title || "Course cover"}
                  />
                </td>
                <td className="px-6 py-4">{course.title}</td>
                <td className="px-6 py-4">{course.lesson_count} Lessons</td>
                <td className="px-6 py-4">{formatPrice(course.price)}</td>
                <td className="px-6 py-4">
                  {formatCourseDate(course.created_at)}
                </td>
                <td className="px-6 py-4">
                  {formatCourseDate(course.updated_at)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer"
                      aria-label={`Delete ${course.title}`}
                      onClick={() => onDelete(course)}
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        aria-label={`Edit ${course.title}`}
                      >
                        <SquarePen aria-hidden="true" className="size-5" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
