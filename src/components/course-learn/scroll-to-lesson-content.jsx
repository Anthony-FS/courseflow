"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { resetLessonContentScroll } from "@/lib/course-learn-scroll";

// useLayoutEffect warns during SSR; this component only ever acts in the browser.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Lessons are separate URLs, but the document scroll is locked, so Next's
 * built-in scroll handling never reaches the pane that actually scrolls.
 * Reset it before paint whenever the active sub-lesson changes, so the new
 * lesson is never seen mid-scroll. Back/forward navigations are left alone.
 */
function ScrollToLessonContentOnNavigate({ subLessonId }) {
  const previousSubLessonId = useRef(subLessonId);
  const isPopNavigation = useRef(false);

  useEffect(() => {
    function handlePopState() {
      isPopNavigation.current = true;
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (previousSubLessonId.current === subLessonId) {
      return;
    }

    previousSubLessonId.current = subLessonId;

    if (isPopNavigation.current) {
      isPopNavigation.current = false;
      return;
    }

    resetLessonContentScroll();
  }, [subLessonId]);

  // Clear the flag once the popped render has settled so a stale pop can't
  // swallow the next click-driven reset.
  useEffect(() => {
    isPopNavigation.current = false;
  });

  return null;
}

export { ScrollToLessonContentOnNavigate };
