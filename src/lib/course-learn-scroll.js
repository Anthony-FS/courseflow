export const LEARN_LESSON_CONTENT_ID = "learn-lesson-content";
export const LEARN_CONTENT_PANE_ID = "learn-content-pane";

export function isMobileLearnLayout() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 1023px)").matches;
}

/**
 * The learn shell locks document scroll, so the window is never what moves.
 * Desktop scrolls the content pane; mobile scrolls the outer wrapper that
 * stacks the sidebar above the content. Reset only the lesson content — the
 * sidebar keeps its own scroll position.
 */
export function resetLessonContentScroll() {
  if (typeof document === "undefined") {
    return;
  }

  const pane = document.getElementById(LEARN_CONTENT_PANE_ID);
  if (pane) {
    pane.scrollTop = 0;
  }

  if (!isMobileLearnLayout()) {
    return;
  }

  scrollToLessonContent();
}

export function scrollToLessonContent() {
  const target = document.getElementById(LEARN_LESSON_CONTENT_ID);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "auto", block: "start" });
}
