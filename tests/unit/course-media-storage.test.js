import { describe, expect, it } from "vitest";

import {
  groupStorageRefsByBucket,
  parseStorageObjectRef,
} from "@/lib/course-media-storage";

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
