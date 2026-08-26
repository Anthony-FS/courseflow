import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  createBlock,
  getVideoEmbedInfo,
  hasVideoContentBlock,
  hydrateSubLessonBlocks,
  migrateLegacyVideoIntoBlocks,
  moveBlock,
  parseSubLessonContent,
  serializeSubLessonContent,
  getImageSrc,
  sanitizeVideoCaption,
  collectMediaUrlsFromContent,
  collectMediaUrlsFromSubLessonRecords,
} from "@/lib/sub-lesson-blocks";

describe("sub-lesson-blocks utilities", () => {
  it("detects and normalizes YouTube and Vimeo URLs", () => {
    expect(
      getVideoEmbedInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toEqual({
      type: "youtube",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      id: "dQw4w9WgXcQ",
    });

    expect(getVideoEmbedInfo("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      type: "youtube",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      id: "dQw4w9WgXcQ",
    });

    expect(getVideoEmbedInfo("https://vimeo.com/123456789")).toEqual({
      type: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789",
      id: "123456789",
    });

    expect(getVideoEmbedInfo("https://cdn.example.com/video.mp4")).toEqual({
      type: "video",
      src: "https://cdn.example.com/video.mp4",
    });

    expect(getVideoEmbedInfo("blob:http://localhost:3000/abc")).toEqual({
      type: "video",
      src: "blob:http://localhost:3000/abc",
    });

    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(getVideoEmbedInfo("course-trailers/admin/lesson.mp4")).toEqual({
      type: "video",
      src: "https://example.supabase.co/storage/v1/object/public/course-trailers/admin/lesson.mp4",
    });
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    expect(getVideoEmbedInfo("")).toBeNull();
    expect(getVideoEmbedInfo(null)).toBeNull();
  });

  it("resolves stored image paths to public storage URLs", () => {
    expect(getImageSrc("https://cdn.example.com/diagram.png")).toBe(
      "https://cdn.example.com/diagram.png",
    );
    expect(getImageSrc("/diagrams/local.png")).toBe("/diagrams/local.png");
    expect(getImageSrc("blob:http://localhost:3000/abc")).toBe(
      "blob:http://localhost:3000/abc",
    );
    expect(getImageSrc("")).toBeNull();
    expect(getImageSrc(null)).toBeNull();

    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(getImageSrc("course-covers/admin/diagram.png")).toBe(
      "https://example.supabase.co/storage/v1/object/public/course-covers/admin/diagram.png",
    );
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
  });
  it("creates valid default blocks", () => {
    const textBlock = createBlock(BLOCK_TYPES.TEXT, { content: "Sample text" });
    expect(textBlock.type).toBe("text");
    expect(textBlock.content).toBe("Sample text");
    expect(textBlock.id).toBeDefined();

    const imageBlock = createBlock(BLOCK_TYPES.IMAGE, { url: "/test.jpg" });
    expect(imageBlock.type).toBe("image");
    expect(imageBlock.url).toBe("/test.jpg");

    const calloutBlock = createBlock(BLOCK_TYPES.CALLOUT, {
      title: "Note",
      content: "Extra info",
    });
    expect(calloutBlock.type).toBe("callout");
    expect(calloutBlock.title).toBe("Note");
  });

  it("parses empty, null, or undefined values into empty array", () => {
    expect(parseSubLessonContent(null)).toEqual([]);
    expect(parseSubLessonContent("")).toEqual([]);
    expect(parseSubLessonContent(undefined)).toEqual([]);
  });

  it("parses legacy plain text into a single text block", () => {
    const raw = "• Point 1\n• Point 2";
    const blocks = parseSubLessonContent(raw);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].content).toBe(raw);
  });

  it("parses JSON array of blocks correctly", () => {
    const rawBlocks = [
      { id: "b1", type: "text", content: "Introduction" },
      { id: "b2", type: "image", url: "https://example.com/diagram.png" },
      { id: "b3", type: "callout", title: "เนื้อหาเสริม", content: "Code info" },
    ];
    const jsonStr = JSON.stringify(rawBlocks);

    const parsed = parseSubLessonContent(jsonStr);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].type).toBe("text");
    expect(parsed[1].type).toBe("image");
    expect(parsed[2].type).toBe("callout");
  });

  it("serializes single plain text as plain string", () => {
    const blocks = [createBlock(BLOCK_TYPES.TEXT, { content: "Simple note" })];
    expect(serializeSubLessonContent(blocks)).toBe("Simple note");
  });

  it("serializes rich blocks as JSON string", () => {
    const blocks = [
      createBlock(BLOCK_TYPES.TEXT, { content: "Header" }),
      createBlock(BLOCK_TYPES.IMAGE, { url: "/img.png" }),
    ];
    const serialized = serializeSubLessonContent(blocks);
    expect(serialized.startsWith("[")).toBe(true);
    expect(JSON.parse(serialized)).toHaveLength(2);
  });

  it("moves blocks accurately with moveBlock", () => {
    const blocks = [
      { id: "1", type: "text" },
      { id: "2", type: "image" },
      { id: "3", type: "callout" },
    ];

    const reordered = moveBlock(blocks, 0, 2);
    expect(reordered.map((b) => b.id)).toEqual(["2", "3", "1"]);
  });

  it("migrates a stored video into a Video Player block without re-uploading", () => {
    const text = createBlock(BLOCK_TYPES.TEXT, { content: "Read this first" });
    const image = createBlock(BLOCK_TYPES.IMAGE, { url: "/diagram.png" });
    const migrated = migrateLegacyVideoIntoBlocks(
      [text, image],
      "course-trailers/admin/lesson.mp4",
      "Industry Overview Video",
    );

    expect(migrated).toHaveLength(3);
    expect(migrated[0].type).toBe(BLOCK_TYPES.VIDEO);
    expect(migrated[0].url).toBe("course-trailers/admin/lesson.mp4");
    expect(migrated[0].caption).toBe("");
    expect(migrated[1]).toEqual(text);
    expect(migrated[2]).toEqual(image);
  });

  it("does not add a video block when the sub-lesson has no video", () => {
    const text = createBlock(BLOCK_TYPES.TEXT, { content: "Text only" });
    expect(migrateLegacyVideoIntoBlocks([text], null)).toEqual([text]);
    expect(migrateLegacyVideoIntoBlocks([text], "")).toEqual([text]);
    expect(migrateLegacyVideoIntoBlocks([text], "blob:http://localhost/1")).toEqual(
      [text],
    );
    expect(
      migrateLegacyVideoIntoBlocks([text], "course-attachments/a/notes.pdf"),
    ).toEqual([text]);
    expect(hasVideoContentBlock([text])).toBe(false);
  });

  it("does not duplicate an existing Video Player block", () => {
    const existing = [
      createBlock(BLOCK_TYPES.VIDEO, {
        url: "course-trailers/admin/lesson.mp4",
      }),
      createBlock(BLOCK_TYPES.TEXT, { content: "Already migrated" }),
    ];

    const migrated = migrateLegacyVideoIntoBlocks(
      existing,
      "course-trailers/admin/lesson.mp4",
      "Industry Overview Video",
    );

    expect(migrated).toHaveLength(2);
    expect(migrated.filter((block) => block.type === BLOCK_TYPES.VIDEO)).toHaveLength(
      1,
    );
  });

  it("hydrates a sub-lesson by copying the legacy video into blocks", () => {
    const hydrated = hydrateSubLessonBlocks({
      title: "Industry Overview",
      description: "Welcome to mobile and game development!",
      videoUrl: "course-trailers/admin/lesson.mp4",
      videoName: "Industry Overview Video",
    });

    expect(hasVideoContentBlock(hydrated.blocks)).toBe(true);
    expect(hydrated.blocks[0].type).toBe(BLOCK_TYPES.VIDEO);
    expect(hydrated.blocks[0].url).toBe("course-trailers/admin/lesson.mp4");
    expect(hydrated.blocks[0].caption).toBe("");
    expect(hydrated.blocks[1].type).toBe(BLOCK_TYPES.TEXT);
    expect(JSON.parse(hydrated.description)[0].type).toBe("video");
  });

  it("does not use a video filename as a caption", () => {
    expect(sanitizeVideoCaption("game_dev.mp4")).toBe("");
    expect(sanitizeVideoCaption("clip.webm")).toBe("");
    expect(sanitizeVideoCaption("How ads work")).toBe("How ads work");

    const parsed = parseSubLessonContent(
      JSON.stringify([
        {
          id: "v1",
          type: "video",
          url: "course-trailers/admin/game_dev.mp4",
          caption: "game_dev.mp4",
        },
      ]),
    );

    expect(parsed[0].caption).toBe("");
  });

  it("collects stored image and video urls from sub-lesson content", () => {
    const description = JSON.stringify([
      { id: "t1", type: "text", content: "Hello" },
      { id: "i1", type: "image", url: "course-covers/admin/diagram.png" },
      { id: "v1", type: "video", url: "course-trailers/admin/clip.mp4" },
      { id: "i2", type: "image", url: "blob:http://localhost/preview" },
    ]);

    expect(collectMediaUrlsFromContent(description)).toEqual([
      "course-covers/admin/diagram.png",
      "course-trailers/admin/clip.mp4",
    ]);

    expect(
      collectMediaUrlsFromSubLessonRecords([
        {
          description,
          attachmentUrl: "course-attachments/admin/notes.pdf",
        },
      ]),
    ).toEqual([
      "course-covers/admin/diagram.png",
      "course-trailers/admin/clip.mp4",
      "course-attachments/admin/notes.pdf",
    ]);
  });
});
