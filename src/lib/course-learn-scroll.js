export const LEARN_LESSON_CONTENT_ID = "learn-lesson-content";

const SCROLL_INTENT_KEY = "courseflow:scroll-to-lesson-content";

export function isMobileLearnLayout() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 1023px)").matches;
}

export function markScrollToLessonContentIntent() {
  if (!isMobileLearnLayout()) {
    return;
  }

  sessionStorage.setItem(SCROLL_INTENT_KEY, "1");
}

export function consumeScrollToLessonContentIntent() {
  if (typeof window === "undefined") {
    return false;
  }

  if (sessionStorage.getItem(SCROLL_INTENT_KEY) !== "1") {
    return false;
  }

  sessionStorage.removeItem(SCROLL_INTENT_KEY);
  return true;
}

export function scrollToLessonContent() {
  const target = document.getElementById(LEARN_LESSON_CONTENT_ID);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
