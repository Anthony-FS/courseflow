import { describe, expect, it } from "vitest";

import {
  flattenSubLessons,
  getSubLessonLearningContent,
  learnSubLessonHref,
  mockProgressPercent,
  pickVideoMaterial,
  resolveActiveSubLesson,
  withMockLessonStatuses,
} from "@/lib/course-learn";

const lessons = [
  {
    id: "l1",
    title: "Introduction",
    subLessons: [
      { id: "s1", title: "Welcome" },
      { id: "s2", title: "Four Levels" },
    ],
  },
  {
    id: "l2",
    title: "Theories",
    subLessons: [{ id: "s3", title: "Principles" }],
  },
];

describe("course-learn helpers", () => {
  it("flattens sub-lessons in course order", () => {
    expect(flattenSubLessons(lessons).map((item) => item.id)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
  });

  it("resolves active, previous, and next sub-lessons", () => {
    const flat = flattenSubLessons(lessons);
    const result = resolveActiveSubLesson(flat, "s2");

    expect(result.active.id).toBe("s2");
    expect(result.prev.id).toBe("s1");
    expect(result.next.id).toBe("s3");
  });

  it("defaults to the first sub-lesson when id is missing", () => {
    const flat = flattenSubLessons(lessons);
    const result = resolveActiveSubLesson(flat, undefined);

    expect(result.active.id).toBe("s1");
    expect(result.prev).toBeNull();
  });

  it("mocks statuses relative to the active sub-lesson", () => {
    const withStatus = withMockLessonStatuses(lessons, "s2");

    expect(withStatus[0].subLessons[0].status).toBe("completed");
    expect(withStatus[0].subLessons[1].status).toBe("in-progress");
    expect(withStatus[1].subLessons[0].status).toBe("not-started");
    expect(mockProgressPercent(withStatus)).toBe(33);
  });

  it("builds learn href with encoded query", () => {
    expect(learnSubLessonHref("svc-101", "abc/def")).toBe(
      "/courses/svc-101/learn?subLessonId=abc%2Fdef",
    );
  });

  it("picks video material by file type", () => {
    const picked = pickVideoMaterial([
      {
        name: "notes.pdf",
        file_url: "course-attachments/a/notes.pdf",
        file_type: "application/pdf",
      },
      {
        name: "Industry Overview Video",
        file_url: "course-trailers/admin/lesson.mp4",
        file_type: "video/mp4",
      },
    ]);

    expect(picked?.file_url).toBe("course-trailers/admin/lesson.mp4");
  });

  it("loads sub-lesson content with resolved video url", async () => {
    const supabaseUrl = "https://example.supabase.co";
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;

    const supabase = {
      from(table) {
        const filters = [];
        const chain = {
          select() {
            return chain;
          },
          eq(column, value) {
            filters.push({ column, value });
            return chain;
          },
          maybeSingle: async () => {
            if (table === "sub_lessons") {
              return {
                data: {
                  id: "sub-1",
                  title: "Industry Overview",
                  description: "Welcome to mobile and game development!",
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          then(onFulfilled, onRejected) {
            if (table === "materials") {
              return Promise.resolve({
                data: [
                  {
                    name: "Industry Overview Video",
                    file_url: "course-trailers/admin/lesson.mp4",
                    file_type: "video/mp4",
                  },
                ],
                error: null,
              }).then(onFulfilled, onRejected);
            }
            return Promise.resolve({ data: [], error: null }).then(
              onFulfilled,
              onRejected,
            );
          },
        };
        return chain;
      },
    };

    const result = await getSubLessonLearningContent(supabase, {
      courseId: "course-1",
      subLessonId: "sub-1",
    });

    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    expect(result).toEqual({
      title: "Industry Overview",
      description: "Welcome to mobile and game development!",
      videoUrl:
        "https://example.supabase.co/storage/v1/object/public/course-trailers/admin/lesson.mp4",
      videoName: "Industry Overview Video",
    });
  });
});
