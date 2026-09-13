/**
 * Single source of truth for the sub-lesson progress state machine.
 *
 *   Default ──view──▶ In progress ──gate──▶ Completed
 *                          │
 *                          └─ has an unfinished assignment ─▶ Pending Assignment
 *
 * The gate is: reached the end of the content, AND played the video when the
 * sub-lesson has one, AND submitted the assignment when it has one. Only after
 * the gate passes is `completed_at` written, and only that persisted column
 * drives the Completed badge — never optimistic sidebar state.
 */

export const SUB_LESSON_STATUS = {
  /** Progress could not be loaded; render a neutral badge, not Default. */
  UNKNOWN: "unknown",
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  PENDING_ASSIGNMENT: "pending-assignment",
  COMPLETED: "completed",
};

function toSet(ids) {
  return new Set((ids ?? []).filter(Boolean));
}

/**
 * Badge for one sub-lesson.
 *
 * An unfinished assignment blocks Completed outright: the orange badge must
 * never be overwritten by a green check while the work is still outstanding.
 */
export function deriveSubLessonStatus({
  visited = false,
  completed = false,
  hasAssignment = false,
  assignmentSubmitted = false,
} = {}) {
  const assignmentOpen = Boolean(hasAssignment) && !assignmentSubmitted;
  const started = Boolean(visited) || Boolean(completed);

  if (assignmentOpen) {
    return started
      ? SUB_LESSON_STATUS.PENDING_ASSIGNMENT
      : SUB_LESSON_STATUS.NOT_STARTED;
  }

  if (completed) {
    return SUB_LESSON_STATUS.COMPLETED;
  }

  return started ? SUB_LESSON_STATUS.IN_PROGRESS : SUB_LESSON_STATUS.NOT_STARTED;
}

/** Annotate a course outline with a `status` on every sub-lesson. */
export function withSubLessonStatuses(
  lessons,
  {
    visitedIds = [],
    completedIds = [],
    assignmentSubLessonIds = [],
    submittedAssignmentSubLessonIds = [],
    isReady = true,
  } = {},
) {
  const visited = toSet(visitedIds);
  const completed = toSet(completedIds);
  const hasAssignment = toSet(assignmentSubLessonIds);
  const assignmentSubmitted = toSet(submittedAssignmentSubLessonIds);

  return (lessons ?? []).map((lesson) => ({
    ...lesson,
    subLessons: (lesson.subLessons ?? []).map((subLesson) => ({
      ...subLesson,
      status: isReady
        ? deriveSubLessonStatus({
            visited: visited.has(subLesson.id),
            completed: completed.has(subLesson.id),
            hasAssignment: hasAssignment.has(subLesson.id),
            assignmentSubmitted: assignmentSubmitted.has(subLesson.id),
          })
        : SUB_LESSON_STATUS.UNKNOWN,
    })),
  }));
}

export function courseProgressPercent(lessonsWithStatus) {
  const all = (lessonsWithStatus ?? []).flatMap(
    (lesson) => lesson.subLessons ?? [],
  );
  if (all.length === 0) {
    return 0;
  }

  const completed = all.filter(
    (item) => item.status === SUB_LESSON_STATUS.COMPLETED,
  ).length;
  return Math.round((completed / all.length) * 100);
}

/**
 * The completion gate. Media conditions and scroll-to-end are necessary
 * together — neither alone completes a sub-lesson, and a text-only sub-lesson
 * needs only the scroll.
 */
export function canCompleteSubLesson({
  hasVideo = false,
  videoPlayed = false,
  hasAssignment = false,
  assignmentSubmitted = false,
  reachedEnd = false,
} = {}) {
  if (!reachedEnd) {
    return false;
  }
  if (hasVideo && !videoPlayed) {
    return false;
  }
  if (hasAssignment && !assignmentSubmitted) {
    return false;
  }
  return true;
}
