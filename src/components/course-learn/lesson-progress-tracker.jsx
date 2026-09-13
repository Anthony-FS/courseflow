"use client";

import { useEffect, useRef } from "react";

import { useSubLessonCompletion } from "@/hooks/use-sub-lesson-completion";
import {
  markSubLessonVisited,
  notifySubLessonVisited,
} from "@/lib/course-learn-progress";
import { getLearnScrollContainer } from "@/lib/course-learn-scroll";

/** Sticky lesson nav height — keep the sentinel "below" it to count as read. */
const BOTTOM_NAV_OFFSET_PX = 88;

function getScrollParent(el) {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Drives the sub-lesson state machine from the learner's actual behaviour.
 *
 * Mounting means the sub-lesson was opened, which leaves Default. The trailing
 * sentinel element marks the end of the content: once it is scrolled into
 * view, the completion gate decides whether to persist `complete`.
 *
 * Render this last inside the lesson content, keyed by sub-lesson.
 */
function LessonProgressTracker({
  courseId,
  subLessonId,
  hasVideo = false,
  hasAssignment = false,
  videoPlayed = false,
  assignmentSubmitted = false,
  completed = false,
  visited = false,
}) {
  const ref = useRef(null);
  const { reportReachedEnd } = useSubLessonCompletion({
    courseId,
    subLessonId,
    hasVideo,
    hasAssignment,
    initialVideoPlayed: videoPlayed,
    initialAssignmentSubmitted: assignmentSubmitted,
    initialCompleted: completed,
  });

  // Transition 1: viewing the sub-lesson moves it out of Default.
  useEffect(() => {
    if (!courseId || !subLessonId || visited) {
      return;
    }

    notifySubLessonVisited(courseId, subLessonId);
    void markSubLessonVisited(courseId, subLessonId).catch(() => {
      // Sidebar keeps the optimistic badge for this session; the next visit
      // writes it again.
    });
  }, [courseId, subLessonId, visited]);

  // Transition 4: the scroll gate.
  useEffect(() => {
    const el = ref.current;
    if (!el || !courseId || !subLessonId) {
      return undefined;
    }

    let cancelled = false;
    let settled = false;

    const markReachedEnd = () => {
      if (cancelled || settled) {
        return;
      }
      settled = true;
      reportReachedEnd();
    };

    const isPastBottom = () => {
      const rect = el.getBoundingClientRect();
      return rect.top <= window.innerHeight - BOTTOM_NAV_OFFSET_PX;
    };

    // Content shorter than the viewport is already fully read.
    if (isPastBottom()) {
      markReachedEnd();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markReachedEnd();
        }
      },
      {
        root: null,
        rootMargin: `0px 0px -${BOTTOM_NAV_OFFSET_PX}px 0px`,
        threshold: 0,
      },
    );
    observer.observe(el);

    function onScrollOrResize() {
      if (isPastBottom()) {
        markReachedEnd();
      }
    }

    // Belt and braces for browsers that miss an intersection while the pane is
    // scrolled programmatically. `settled` keeps this to a single report.
    const scrollContainer = getLearnScrollContainer() ?? getScrollParent(el);
    scrollContainer?.addEventListener("scroll", onScrollOrResize, {
      passive: true,
    });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelled = true;
      observer.disconnect();
      scrollContainer?.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [courseId, reportReachedEnd, subLessonId]);

  return <div ref={ref} className="h-px w-full" aria-hidden />;
}

export { LessonProgressTracker };
