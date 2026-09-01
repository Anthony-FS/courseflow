const STORAGE_KEY = "courseflow:lesson-video-watched";
export const LESSON_VIDEO_WATCHED_EVENT = "courseflow:lesson-video-watched";

function entryKey(courseId, subLessonId) {
  return `${String(courseId ?? "").trim()}:${String(subLessonId ?? "").trim()}`;
}

function readWatchedMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function hasWatchedLessonVideo(courseId, subLessonId) {
  const key = entryKey(courseId, subLessonId);
  if (!key || key === ":") {
    return false;
  }

  return Boolean(readWatchedMap()[key]);
}

export function markLessonVideoWatched(courseId, subLessonId) {
  if (typeof window === "undefined") {
    return;
  }

  const key = entryKey(courseId, subLessonId);
  if (!key || key === ":") {
    return;
  }

  const next = { ...readWatchedMap(), [key]: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures; in-memory event still fires.
  }

  window.dispatchEvent(
    typeof CustomEvent === "function"
      ? new CustomEvent(LESSON_VIDEO_WATCHED_EVENT, {
          detail: { courseId, subLessonId },
        })
      : { type: LESSON_VIDEO_WATCHED_EVENT, detail: { courseId, subLessonId } },
  );
}
