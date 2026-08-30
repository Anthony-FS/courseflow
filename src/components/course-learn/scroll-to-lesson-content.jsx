"use client";

import { useEffect } from "react";

import {
  consumeScrollToLessonContentIntent,
  scrollToLessonContent,
} from "@/lib/course-learn-scroll";

function ScrollToLessonContentOnNavigate({ subLessonId }) {
  useEffect(() => {
    if (!consumeScrollToLessonContentIntent()) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToLessonContent();
    });
  }, [subLessonId]);

  return null;
}

export { ScrollToLessonContentOnNavigate };
