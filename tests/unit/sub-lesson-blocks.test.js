import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  createBlock,
  getVideoEmbedInfo,
  moveBlock,
  parseSubLessonContent,
  serializeSubLessonContent,
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

    expect(getVideoEmbedInfo("")).toBeNull();
    expect(getVideoEmbedInfo(null)).toBeNull();
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
});
