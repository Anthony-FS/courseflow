/** Flatten lessons → ordered sub-lessons for prev/next navigation. */
export function flattenSubLessons(lessons) {
  return (lessons ?? []).flatMap((lesson) =>
    (lesson.subLessons ?? []).map((subLesson) => ({
      id: subLesson.id,
      title: subLesson.title ?? "",
      lessonId: lesson.id,
      lessonTitle: lesson.title ?? "",
    })),
  );
}

/**
 * Resolve the active sub-lesson from `?subLessonId=`, defaulting to the first.
 * Also returns previous / next siblings in course order.
 */
export function resolveActiveSubLesson(flatSubLessons, subLessonId) {
  const list = flatSubLessons ?? [];
  if (list.length === 0) {
    return { active: null, index: -1, prev: null, next: null };
  }

  const requestedId = String(subLessonId ?? "").trim();
  const foundIndex = requestedId
    ? list.findIndex((item) => item.id === requestedId)
    : -1;
  const index = foundIndex >= 0 ? foundIndex : 0;

  return {
    active: list[index],
    index,
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  };
}

/**
 * Temporary status map until `sub_lesson_progress` is wired:
 * before active → completed, active → in-progress, after → not-started.
 */
export function withMockLessonStatuses(lessons, activeSubLessonId) {
  const flat = flattenSubLessons(lessons);
  const activeIndex = flat.findIndex((item) => item.id === activeSubLessonId);
  const pivot = activeIndex >= 0 ? activeIndex : 0;

  return (lessons ?? []).map((lesson) => ({
    ...lesson,
    subLessons: (lesson.subLessons ?? []).map((subLesson) => {
      const index = flat.findIndex((item) => item.id === subLesson.id);
      let status = "not-started";
      if (index >= 0 && index < pivot) {
        status = "completed";
      } else if (index === pivot) {
        status = "in-progress";
      }
      return { ...subLesson, status };
    }),
  }));
}

export function mockProgressPercent(lessonsWithStatus) {
  const all = (lessonsWithStatus ?? []).flatMap(
    (lesson) => lesson.subLessons ?? [],
  );
  if (all.length === 0) {
    return 0;
  }
  const completed = all.filter((item) => item.status === "completed").length;
  return Math.round((completed / all.length) * 100);
}

export function learnSubLessonHref(courseCode, subLessonId) {
  const code = encodeURIComponent(String(courseCode ?? "").trim());
  const id = encodeURIComponent(String(subLessonId ?? "").trim());
  return `/courses/${code}/learn?subLessonId=${id}`;
}

/** Placeholder until learner assignment API exists. */
export const MOCK_ASSIGNMENT = {
  question: "What are the 4 elements of service design?",
  status: "pending",
  deadlineLabel: "Assign within 2 days",
};
