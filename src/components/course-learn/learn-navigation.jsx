"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { LessonContentSkeleton } from "@/components/course-learn/lesson-content-skeleton";

const LearnNavigationContext = createContext({
  beginSubLessonNavigation: () => {},
  isContentPending: false,
});

function LearnNavigationProvider({ activeSubLessonId, children }) {
  const [pendingSubLessonId, setPendingSubLessonId] = useState(null);

  useEffect(() => {
    setPendingSubLessonId(null);
  }, [activeSubLessonId]);

  const beginSubLessonNavigation = useCallback(
    (subLessonId) => {
      const id = String(subLessonId ?? "").trim();
      if (!id || id === activeSubLessonId) {
        return;
      }
      setPendingSubLessonId(id);
    },
    [activeSubLessonId],
  );

  const isContentPending =
    Boolean(pendingSubLessonId) && pendingSubLessonId !== activeSubLessonId;

  return (
    <LearnNavigationContext.Provider
      value={{ beginSubLessonNavigation, isContentPending }}
    >
      {children}
    </LearnNavigationContext.Provider>
  );
}

function useLearnNavigation() {
  return useContext(LearnNavigationContext);
}

function LearnLessonContentPending({ children }) {
  const { isContentPending } = useLearnNavigation();

  return (
    <div className="relative min-h-0 w-full max-w-3xl flex-1 xl:max-w-4xl">
      <div
        className={isContentPending ? "invisible" : undefined}
        aria-hidden={isContentPending || undefined}
      >
        {children}
      </div>
      {isContentPending ? (
        <div
          className="absolute inset-0 z-10 overflow-y-auto bg-white"
          aria-busy="true"
        >
          <LessonContentSkeleton />
        </div>
      ) : null}
    </div>
  );
}

export {
  LearnLessonContentPending,
  LearnNavigationProvider,
  useLearnNavigation,
};
