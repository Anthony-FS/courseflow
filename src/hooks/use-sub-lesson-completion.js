"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  markSubLessonCompleted,
  SUB_LESSON_PROGRESS_EVENT,
} from "@/lib/course-learn-progress";
import {
  hasWatchedLessonVideo,
  LESSON_VIDEO_WATCHED_EVENT,
} from "@/lib/course-learn-video";
import { canCompleteSubLesson } from "@/lib/sub-lesson-status";

function subscribeToVideoPlayed(onStoreChange) {
  window.addEventListener(LESSON_VIDEO_WATCHED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener(LESSON_VIDEO_WATCHED_EVENT, onStoreChange);
  };
}

/**
 * Owns the completion gate for the active sub-lesson: collects the media and
 * assignment signals, waits for the caller to report end-of-content, then
 * writes `complete` exactly once.
 *
 * Mount this keyed by sub-lesson — a fresh instance per sub-lesson is what
 * keeps the gate state from leaking across navigations.
 */
function useSubLessonCompletion({
  courseId,
  subLessonId,
  hasVideo = false,
  hasAssignment = false,
  initialVideoPlayed = false,
  initialAssignmentSubmitted = false,
  initialCompleted = false,
}) {
  const [reachedEnd, setReachedEnd] = useState(false);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(
    initialAssignmentSubmitted,
  );
  // Already completed in the DB, or completed during this visit — either way
  // the write must not run again.
  const completedRef = useRef(initialCompleted);

  // localStorage is the same-device fast path for "played"; the server value
  // arrived as `initialVideoPlayed`. Nothing is read during SSR.
  const playedOnThisDevice = useSyncExternalStore(
    subscribeToVideoPlayed,
    () => hasWatchedLessonVideo(courseId, subLessonId),
    () => false,
  );
  const videoPlayed = initialVideoPlayed || playedOnThisDevice;

  useEffect(() => {
    if (!hasAssignment || assignmentSubmitted) {
      return undefined;
    }

    function handleProgress(event) {
      const detail = event?.detail;
      if (detail?.action !== "submit_assignment") {
        return;
      }
      if (detail?.subLessonId !== subLessonId) {
        return;
      }
      setAssignmentSubmitted(true);
    }

    window.addEventListener(SUB_LESSON_PROGRESS_EVENT, handleProgress);
    return () => {
      window.removeEventListener(SUB_LESSON_PROGRESS_EVENT, handleProgress);
    };
  }, [assignmentSubmitted, hasAssignment, subLessonId]);

  useEffect(() => {
    if (completedRef.current || !courseId || !subLessonId) {
      return;
    }

    const allowed = canCompleteSubLesson({
      hasVideo,
      videoPlayed,
      hasAssignment,
      assignmentSubmitted,
      reachedEnd,
    });
    if (!allowed) {
      return;
    }

    // Claim before the request so a re-render mid-flight cannot double-write.
    completedRef.current = true;
    void markSubLessonCompleted(courseId, subLessonId).catch(() => {
      // Release the claim so a later signal (or a remount) can retry; the
      // sidebar stays un-green because only a successful write notifies it.
      completedRef.current = false;
    });
  }, [
    assignmentSubmitted,
    courseId,
    hasAssignment,
    hasVideo,
    reachedEnd,
    subLessonId,
    videoPlayed,
  ]);

  const reportReachedEnd = useCallback(() => {
    setReachedEnd(true);
  }, []);

  return { reportReachedEnd };
}

export { useSubLessonCompletion };
