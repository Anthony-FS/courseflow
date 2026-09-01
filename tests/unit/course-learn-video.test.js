import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasWatchedLessonVideo,
  markLessonVideoWatched,
  LESSON_VIDEO_WATCHED_EVENT,
} from "@/lib/course-learn-video";

describe("course-learn-video", () => {
  beforeEach(() => {
    const store = new Map();
    const listeners = new Map();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
          store.set(key, String(value));
        },
        removeItem: (key) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
      addEventListener: (type, handler) => {
        const list = listeners.get(type) ?? [];
        list.push(handler);
        listeners.set(type, list);
      },
      removeEventListener: (type, handler) => {
        const list = listeners.get(type) ?? [];
        listeners.set(
          type,
          list.filter((item) => item !== handler),
        );
      },
      dispatchEvent: (event) => {
        const list = listeners.get(event.type) ?? [];
        for (const handler of list) {
          handler(event);
        }
        return true;
      },
    });

    // Keep localStorage helpers that read window.localStorage working.
    vi.stubGlobal("localStorage", window.localStorage);
  });

  it("records and reads watched video state per lesson", () => {
    expect(hasWatchedLessonVideo("c1", "s1")).toBe(false);

    markLessonVideoWatched("c1", "s1");

    expect(hasWatchedLessonVideo("c1", "s1")).toBe(true);
    expect(hasWatchedLessonVideo("c1", "s2")).toBe(false);
  });

  it("dispatches a watched event", () => {
    const handler = vi.fn();
    window.addEventListener(LESSON_VIDEO_WATCHED_EVENT, handler);

    markLessonVideoWatched("c1", "s1");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      courseId: "c1",
      subLessonId: "s1",
    });

    window.removeEventListener(LESSON_VIDEO_WATCHED_EVENT, handler);
  });
});
