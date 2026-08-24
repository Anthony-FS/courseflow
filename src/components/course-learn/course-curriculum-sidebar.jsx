"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { LessonStatusIcon } from "@/components/course-learn/lesson-status-icon";
import { learnSubLessonHref } from "@/lib/course-learn";
import { cn } from "@/lib/utils";

function formatModuleNumber(index) {
  return String(index + 1).padStart(2, "0");
}

/**
 * Temporary curriculum sidebar matching the Figma prop contract.
 * Replace this export when the shared team component is ready.
 *
 * Remount with `key={activeLessonId}` from the parent when the active
 * module changes so the accordion opens on the correct section.
 */
function CourseCurriculumSidebar({
  courseCode,
  courseTitle,
  courseSummary,
  progressPercent = 0,
  lessons = [],
  activeSubLessonId,
}) {
  const activeLessonId =
    lessons.find((lesson) =>
      lesson.subLessons?.some((sub) => sub.id === activeSubLessonId),
    )?.id ?? lessons[0]?.id ?? null;

  const [openId, setOpenId] = useState(activeLessonId);

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-300 bg-white px-6 py-8 lg:w-[22.5rem] lg:shrink-0 lg:px-8">
      <p className="text-body3 font-medium text-orange-500">Course</p>
      <h2 className="mt-2 text-headline3 font-medium tracking-[-0.02em] text-black">
        {courseTitle}
      </h2>
      {courseSummary ? (
        <p className="mt-3 line-clamp-3 text-body3 text-gray-700">
          {courseSummary}
        </p>
      ) : null}

      <div className="mt-6">
        <p className="text-body3 font-medium text-black">
          {progressPercent}% Complete
        </p>
        <svg
          className="mt-2 h-2.5 w-full"
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
        >
          <rect width="100" height="10" rx="5" className="fill-gray-300" />
          <rect
            width={Math.min(100, Math.max(0, progressPercent))}
            height="10"
            rx="5"
            className="fill-blue-500"
          />
        </svg>
      </div>

      <nav className="mt-8" aria-label="Course curriculum">
        {lessons.length === 0 ? (
          <p className="text-body3 text-gray-700">
            Lessons will appear here once they are added.
          </p>
        ) : (
          <ul className="divide-y divide-gray-300 border-y border-gray-300">
            {lessons.map((lesson, index) => {
              const isOpen = openId === lesson.id;
              const panelId = `learn-module-${lesson.id}`;

              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId(isOpen ? null : lesson.id)}
                    className="flex w-full items-center gap-3 py-4 text-left"
                  >
                    <span className="text-body2 font-medium text-gray-700">
                      {formatModuleNumber(index)}
                    </span>
                    <span className="flex-1 text-body2 font-medium text-black">
                      {lesson.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-gray-700 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>

                  {isOpen ? (
                    <ul id={panelId} className="space-y-1 pb-4">
                      {(lesson.subLessons ?? []).map((subLesson) => {
                        const isActive = subLesson.id === activeSubLessonId;

                        return (
                          <li key={subLesson.id}>
                            <Link
                              href={learnSubLessonHref(courseCode, subLesson.id)}
                              className={cn(
                                "flex items-start gap-3 rounded-lg px-3 py-2.5 text-body3 text-gray-700 transition-colors",
                                isActive
                                  ? "bg-blue-100 font-medium text-black"
                                  : "hover:bg-gray-100",
                              )}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <LessonStatusIcon
                                status={subLesson.status}
                                className="mt-0.5"
                              />
                              <span>{subLesson.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

export { CourseCurriculumSidebar };
