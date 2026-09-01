"use client";

import { useEffect, useRef } from "react";

import {
  markSubLessonVisited,
  notifySubLessonVisited,
} from "@/lib/course-learn-progress";

/** Sticky lesson nav height — keep sentinel "below" it to count as fully read. */
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
 * Marks the active sub-lesson visited once its end is scrolled into view
 * (user has reached the bottom of the lesson content).
 */
function LessonReadSentinel({ courseId, subLessonId }) {
  const ref = useRef(null);
  const markedRef = useRef(false);

  useEffect(() => {
    markedRef.current = false;
    const el = ref.current;
    if (!el || !courseId || !subLessonId) {
      return undefined;
    }

    let cancelled = false;

    const markRead = () => {
      if (cancelled || markedRef.current) {
        return;
      }
      markedRef.current = true;
      notifySubLessonVisited(courseId, subLessonId);
      void markSubLessonVisited(courseId, subLessonId).catch(() => {
        // Keep optimistic sidebar state for this session; retry on remount.
      });
    };

    const isPastBottom = () => {
      const rect = el.getBoundingClientRect();
      return rect.top <= window.innerHeight - BOTTOM_NAV_OFFSET_PX;
    };

    if (isPastBottom()) {
      markRead();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markRead();
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
        markRead();
      }
    }

    const scrollParent = getScrollParent(el);
    scrollParent?.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelled = true;
      observer.disconnect();
      scrollParent?.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [courseId, subLessonId]);

  return <div ref={ref} className="h-px w-full" aria-hidden />;
}

export { LessonReadSentinel };
