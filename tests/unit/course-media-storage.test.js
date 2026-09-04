import { describe, expect, it } from "vitest";

import {
  collectLessonMediaUrls,
  groupStorageRefsByBucket,
  parseStorageObjectRef,
  unusedMediaUrls,
} from "@/lib/course-media-storage";
import { createMockSupabase } from "../helpers/mock-supabase.js";

describe("parseStorageObjectRef", () => {
  it("parses bucket/path storage refs", () => {
    expect(parseStorageObjectRef("course-covers/user/a.jpg")).toEqual({
      bucket: "course-covers",
      path: "user/a.jpg",
    });
  });

  it("parses public storage URLs", () => {
    expect(
      parseStorageObjectRef(
        "https://abc.supabase.co/storage/v1/object/public/course-trailers/u/t.mp4",
      ),
    ).toEqual({
      bucket: "course-trailers",
      path: "u/t.mp4",
    });
  });

  it("rejects unknown buckets and empty values", () => {
    expect(parseStorageObjectRef("other-bucket/x.png")).toBeNull();
    expect(parseStorageObjectRef("")).toBeNull();
    expect(parseStorageObjectRef("https://example.com/file.png")).toBeNull();
  });
});

describe("groupStorageRefsByBucket", () => {
  it("dedupes paths per bucket", () => {
    const grouped = groupStorageRefsByBucket([
      "course-covers/a/1.jpg",
      "course-covers/a/1.jpg",
      "course-attachments/a/doc.pdf",
    ]);

    expect([...grouped.get("course-covers").values()]).toEqual(["a/1.jpg"]);
    expect([...grouped.get("course-attachments").values()]).toEqual(["a/doc.pdf"]);
  });
});

describe("unusedMediaUrls", () => {
  it("returns previous urls that are no longer referenced", () => {
    expect(
      unusedMediaUrls(
        [
          "course-covers/a/old.png",
          "course-covers/a/keep.png",
          "course-covers/a/old.png",
        ],
        ["course-covers/a/keep.png", "course-covers/a/new.png"],
      ),
    ).toEqual(["course-covers/a/old.png"]);
  });
});

describe("collectLessonMediaUrls", () => {
  it("reads image blocks and material attachments for a lesson", async () => {
    const supabase = createMockSupabase({
      subLessonsSelect: [
        {
          id: "sub-1",
          lesson_id: "lesson-1",
          description: JSON.stringify([
            { id: "i1", type: "image", url: "course-covers/u/old.png" },
          ]),
        },
      ],
      materialsSelect: [
        {
          sub_lesson_id: "sub-1",
          file_url: "course-attachments/u/notes.pdf",
        },
      ],
    });

    const urls = await collectLessonMediaUrls(supabase, "lesson-1");
    expect(urls).toEqual([
      "course-covers/u/old.png",
      "course-attachments/u/notes.pdf",
    ]);
  });
});
