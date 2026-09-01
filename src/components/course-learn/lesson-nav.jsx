"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  markSubLessonCompleted,
  SUB_LESSON_PROGRESS_EVENT,
} from "@/lib/course-learn-progress";
import { learnSubLessonHref } from "@/lib/course-learn";
import { hasWatchedLessonVideo } from "@/lib/course-learn-video";
import { cn } from "@/lib/utils";

function uniqueIds(ids) {
  return [...new Set((ids ?? []).filter(Boolean))];
}

function LessonNav({
  courseId,
  courseCode,
  currentSubLessonId,
  previous,
  next,
  requiresVideo = false,
  subLessonIds = [],
  initialCompletedIds = [],
  className,
}) {
  const [completedIds, setCompletedIds] = useState(() =>
    uniqueIds(initialCompletedIds),
  );

  useEffect(() => {
    setCompletedIds(uniqueIds(initialCompletedIds));
  }, [initialCompletedIds.join("|")]);

  useEffect(() => {
    function handleProgressEvent(event) {
      if (event?.detail?.courseId && event.detail.courseId !== courseId) {
        return;
      }
      if (event?.detail?.action !== "complete") {
        return;
      }
      const subLessonId = event?.detail?.subLessonId;
      if (!subLessonId) {
        return;
      }
      setCompletedIds((current) =>
        current.includes(subLessonId) ? current : [...current, subLessonId],
      );
    }

    window.addEventListener(SUB_LESSON_PROGRESS_EVENT, handleProgressEvent);
    return () => {
      window.removeEventListener(SUB_LESSON_PROGRESS_EVENT, handleProgressEvent);
    };
  }, [courseId]);

  const isLastLesson = !next;
  const otherLessonsComplete = (subLessonIds ?? [])
    .filter((id) => id && id !== currentSubLessonId)
    .every((id) => completedIds.includes(id));
  const canFinishCourse = isLastLesson && otherLessonsComplete;

  function completeCurrentLessonIfAllowed() {
    if (
      requiresVideo &&
      !hasWatchedLessonVideo(courseId, currentSubLessonId)
    ) {
      return false;
    }
    void markSubLessonCompleted(courseId, currentSubLessonId);
    return true;
  }

  return (
    <nav
      aria-label="Lesson navigation"
      className={cn(
        "flex w-full items-center justify-between gap-4 border-t border-gray-300 bg-white px-6 py-5 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 justify-start">
        {previous ? (
          <Link
            href={learnSubLessonHref(courseCode, previous.id)}
            className="text-body2 font-medium text-blue-500 transition-colors hover:text-blue-400"
          >
            Previous Lesson
          </Link>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end">
        {next ? (
          <Button asChild size="sm" className="min-h-12 px-6">
            <Link
              href={learnSubLessonHref(courseCode, next.id)}
              onClick={(event) => {
                if (!completeCurrentLessonIfAllowed()) {
                  event.preventDefault();
                }
              }}
            >
              Next Lesson
            </Link>
          </Button>
        ) : canFinishCourse ? (
          <Button asChild size="sm" className="min-h-12 px-6">
            <Link
              href="/my-courses"
              onClick={(event) => {
                if (!completeCurrentLessonIfAllowed()) {
                  event.preventDefault();
                }
              }}
            >
              Finish Course
            </Link>
          </Button>
        ) : (
          <button
            type="button"
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-[12px] bg-gray-400 px-6 text-body3 font-medium text-gray-600"
            onClick={() => {
              toast.error("Please complete all previous lessons before finishing the course.");
            }}
          >
            Finish Course
          </button>
        )}
      </div>
    </nav>
  );
}

export { LessonNav };
