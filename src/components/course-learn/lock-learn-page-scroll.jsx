"use client";

import { useEffect } from "react";

/**
 * Prevent the document from rubber-banding/scrolling behind the fixed learn shell
 * (parent course layout still has a min-height that can create a 1px body scroll).
 */
function LockLearnPageScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  return null;
}

export { LockLearnPageScroll };
