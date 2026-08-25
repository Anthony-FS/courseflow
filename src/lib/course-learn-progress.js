export const SUB_LESSON_PROGRESS_EVENT = "courseflow:sub-lesson-progress";
export const SUB_LESSON_COMPLETED_EVENT = SUB_LESSON_PROGRESS_EVENT;

function storageKey(kind, courseId) {
  return `courseflow:${kind}:${courseId}`;
}

function readIdList(kind, courseId) {
  if (!courseId || typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(kind, courseId)));
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string" && id.length > 0)
      : [];
  } catch {
    return [];
  }
}

function addId(kind, courseId, subLessonId) {
  const id = String(subLessonId ?? "").trim();
  if (!courseId || !id || typeof window === "undefined") {
    return;
  }

  const current = readIdList(kind, courseId);
  if (current.includes(id)) {
    return;
  }

  localStorage.setItem(
    storageKey(kind, courseId),
    JSON.stringify([...current, id]),
  );
  window.dispatchEvent(
    new CustomEvent(SUB_LESSON_PROGRESS_EVENT, { detail: { courseId } }),
  );
}

export function readCompletedSubLessonIds(courseId) {
  return readIdList("completed-sub-lessons", courseId);
}

export function markSubLessonCompleted(courseId, subLessonId) {
  addId("completed-sub-lessons", courseId, subLessonId);
}

export function readVisitedSubLessonIds(courseId) {
  return readIdList("visited-sub-lessons", courseId);
}

export function markSubLessonVisited(courseId, subLessonId) {
  addId("visited-sub-lessons", courseId, subLessonId);
}

export function readSubmittedAssignmentSubLessonIds(courseId) {
  return readIdList("submitted-assignments", courseId);
}

export function markAssignmentSubmitted(courseId, subLessonId) {
  addId("submitted-assignments", courseId, subLessonId);
}
