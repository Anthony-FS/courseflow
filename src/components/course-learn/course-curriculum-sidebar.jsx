"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { LessonStatusIcon } from "@/components/course-learn/lesson-status-icon";
import {
  learnSubLessonHref,
  mockProgressPercent,
  withMockLessonStatuses,
} from "@/lib/course-learn";
import {
  isMobileLearnLayout,
  markScrollToLessonContentIntent,
  scrollToLessonContent,
} from "@/lib/course-learn-scroll";
import {
  markSubLessonVisited,
  SUB_LESSON_PROGRESS_EVENT,
} from "@/lib/course-learn-progress";
import { cn } from "@/lib/utils";

function formatModuleNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function uniqueIds(ids) {
  return [...new Set((ids ?? []).filter(Boolean))];
}

/**
 * Temporary curriculum sidebar matching the Figma prop contract.
 * Replace this export when the shared team component is ready.
 *
 * Remount with `key={activeLessonId}` from the parent when the active
 * module changes so the accordion opens on the correct section.
 */
function CourseCurriculumSidebar({
  courseId,
  courseCode,
  courseTitle,
  courseSummary,
  lessons = [],
  activeSubLessonId,
  assignmentSubLessonIds = [],
  initialVisitedIds = [],
  initialCompletedIds = [],
  initialSubmittedAssignmentIds = [],
}) {
  const activeLessonId =
    lessons.find((lesson) =>
      lesson.subLessons?.some((sub) => sub.id === activeSubLessonId),
    )?.id ?? lessons[0]?.id ?? null;

  const [openId, setOpenId] = useState(activeLessonId);
  const [completedIds, setCompletedIds] = useState(() =>
    uniqueIds(initialCompletedIds),
  );
  const [visitedIds, setVisitedIds] = useState(() =>
    uniqueIds([
      ...initialVisitedIds,
      ...(activeSubLessonId ? [activeSubLessonId] : []),
    ]),
  );
  const [submittedAssignmentIds, setSubmittedAssignmentIds] = useState(() =>
    uniqueIds(initialSubmittedAssignmentIds),
  );

  useEffect(() => {
    setCompletedIds(uniqueIds(initialCompletedIds));
    setVisitedIds(
      uniqueIds([
        ...initialVisitedIds,
        ...(activeSubLessonId ? [activeSubLessonId] : []),
      ]),
    );
    setSubmittedAssignmentIds(uniqueIds(initialSubmittedAssignmentIds));
  }, [
    activeSubLessonId,
    // Serialize so server-fetched arrays don't thrash on identity.
    initialCompletedIds.join("|"),
    initialSubmittedAssignmentIds.join("|"),
    initialVisitedIds.join("|"),
  ]);

  useEffect(() => {
    let cancelled = false;

    async function syncVisit() {
      if (!courseId || !activeSubLessonId) {
        return;
      }

      setVisitedIds((current) =>
        current.includes(activeSubLessonId)
          ? current
          : [...current, activeSubLessonId],
      );

      try {
        await markSubLessonVisited(courseId, activeSubLessonId);
      } catch {
        if (!cancelled) {
          // Keep optimistic visited state for the current session.
        }
      }
    }

    syncVisit();

    return () => {
      cancelled = true;
    };
  }, [courseId, activeSubLessonId]);

  useEffect(() => {
    function handleProgressEvent(event) {
      if (event?.detail?.courseId && event.detail.courseId !== courseId) {
        return;
      }

      const subLessonId = event?.detail?.subLessonId;
      const action = event?.detail?.action;
      if (!subLessonId || !action) {
        return;
      }

      if (action === "visit" || action === "complete" || action === "submit_assignment") {
        setVisitedIds((current) =>
          current.includes(subLessonId) ? current : [...current, subLessonId],
        );
      }
      if (action === "complete") {
        setCompletedIds((current) =>
          current.includes(subLessonId) ? current : [...current, subLessonId],
        );
      }
      if (action === "submit_assignment") {
        setSubmittedAssignmentIds((current) =>
          current.includes(subLessonId) ? current : [...current, subLessonId],
        );
      }
    }

    window.addEventListener(SUB_LESSON_PROGRESS_EVENT, handleProgressEvent);
    return () => {
      window.removeEventListener(SUB_LESSON_PROGRESS_EVENT, handleProgressEvent);
    };
  }, [courseId]);

  const lessonsWithStatus = withMockLessonStatuses(
    lessons,
    activeSubLessonId,
    completedIds,
    {
      visitedIds,
      assignmentSubLessonIds,
      submittedAssignmentSubLessonIds: submittedAssignmentIds,
    },
  );
  const progressPercent = mockProgressPercent(lessonsWithStatus);

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col overflow-x-hidden bg-white px-6 py-8 lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100vh-11rem)] lg:w-[22.5rem] lg:overflow-y-auto lg:border-r lg:border-gray-300 lg:px-8">
      <p className="shrink-0 text-body3 font-medium text-orange-500">Course</p>
      <h2 className="mt-2 shrink-0 break-words text-headline3 font-medium tracking-[-0.02em] text-black">
        {courseTitle}
      </h2>
      {courseSummary ? (
        <p className="mt-3 line-clamp-3 shrink-0 text-body3 text-gray-700">
          {courseSummary}
        </p>
      ) : null}

      <div className="mt-6 shrink-0">
        <p className="text-body3 font-medium text-black">
          {progressPercent}% Complete
        </p>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-300"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
        >
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
            }}
          />
        </div>
      </div>

      <nav className="mt-8" aria-label="Course curriculum">
        {lessons.length === 0 ? (
          <p className="text-body3 text-gray-700">
            Lessons will appear here once they are added.
          </p>
        ) : (
          <ul className="divide-y divide-gray-300 border-y border-gray-300">
            {lessonsWithStatus.map((lesson, index) => {
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
                    <span className="min-w-0 flex-1 break-words text-body2 font-medium text-black">
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
                              onClick={() => {
                                if (!isMobileLearnLayout()) {
                                  return;
                                }

                                if (isActive) {
                                  scrollToLessonContent();
                                  return;
                                }

                                markScrollToLessonContentIntent();
                              }}
                              className={cn(
                                "flex min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-body3 text-gray-700 transition-colors",
                                isActive
                                  ? "bg-blue-100 font-medium text-black"
                                  : "hover:bg-gray-100",
                              )}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <LessonStatusIcon
                                status={subLesson.status}
                                className="mt-0.5 shrink-0"
                              />
                              <span className="min-w-0 break-words">
                                {subLesson.title}
                              </span>
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
