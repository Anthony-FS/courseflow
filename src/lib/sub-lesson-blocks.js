/**
 * Sub-Lesson Rich Content Block Types & Utilities
 */

import { resolveCoverFileUrl, resolveTrailerUrl } from "@/lib/courses";

export const BLOCK_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  CALLOUT: "callout",
};

export function generateBlockId() {
  return "block_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
}

function isEphemeralMediaUrl(url) {
  const value = String(url ?? "").trim();
  return value.startsWith("blob:") || value.startsWith("data:");
}

function normalizeVideoUrl(url) {
  return String(url ?? "").trim();
}

/**
 * Detects and normalizes video URLs (YouTube, Vimeo, or direct files)
 */
export function getVideoEmbedInfo(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube match: regular watch, short URLs, embeds, and mobile/shorts
  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtubeMatch && youtubeMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      id: youtubeMatch[1],
    };
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      id: vimeoMatch[1],
    };
  }

  const src = isEphemeralMediaUrl(trimmed)
    ? trimmed
    : resolveTrailerUrl(trimmed) || trimmed;

  // Direct video file, storage path, or generic stream URL
  return {
    type: "video",
    src,
  };
}

/**
 * Turns a stored image path (course-covers/...) into a playable src.
 * Leaves blob, data, http(s), and root-relative URLs unchanged.
 */
export function getImageSrc(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isEphemeralMediaUrl(trimmed)) return trimmed;

  return resolveCoverFileUrl(trimmed) || trimmed;
}

function isMediaFilenameCaption(caption) {
  const value = String(caption ?? "").trim();
  if (!value) return false;
  return /^[\w.\- ()]+\.(mp4|webm|mov|m4v|avi|mkv|mpeg|mpg)$/i.test(value);
}

export function sanitizeVideoCaption(caption) {
  const value = String(caption ?? "").trim();
  if (!value || isMediaFilenameCaption(value)) return "";
  return value;
}

function normalizeParsedBlock(item, idx) {
  const type = item?.type || BLOCK_TYPES.TEXT;
  const block = {
    id: item?.id || `block-${idx}`,
    type,
    ...item,
  };

  if (type === BLOCK_TYPES.VIDEO) {
    block.caption = sanitizeVideoCaption(block.caption);
  }

  return block;
}

function isUsableLegacyVideoUrl(url) {
  const value = normalizeVideoUrl(url);
  if (!value || isEphemeralMediaUrl(value)) return false;
  if (/\.(pdf|doc|docx|zip)(\?|$)/i.test(value)) return false;
  return true;
}

function videoBlockHasUrl(blocks, url) {
  const target = normalizeVideoUrl(url);
  if (!target) return false;

  return (Array.isArray(blocks) ? blocks : []).some((block) => {
    if (block?.type !== BLOCK_TYPES.VIDEO) return false;
    const existing = normalizeVideoUrl(block.url);
    if (!existing) return false;
    return existing === target || existing.endsWith(target) || target.endsWith(existing);
  });
}

export function hasVideoContentBlock(blocksOrDescription) {
  const blocks = Array.isArray(blocksOrDescription)
    ? blocksOrDescription
    : parseSubLessonContent(blocksOrDescription);

  return blocks.some(
    (block) =>
      block?.type === BLOCK_TYPES.VIDEO && isUsableLegacyVideoUrl(block.url),
  );
}

/**
 * Copies an already-uploaded sub-lesson video into a Video Player block.
 * Does not re-upload. No-ops when there is no video, the URL is a local
 * preview, or a matching video block already exists.
 */
export function migrateLegacyVideoIntoBlocks(blocks, videoUrl, _videoName = "") {
  const existing = Array.isArray(blocks) ? [...blocks] : [];
  const url = normalizeVideoUrl(videoUrl);
  if (!isUsableLegacyVideoUrl(url) || videoBlockHasUrl(existing, url)) {
    return existing;
  }

  const videoBlock = createBlock(BLOCK_TYPES.VIDEO, {
    url,
    caption: "",
  });

  // Keep previous learner order: the standalone player sat above the text.
  return [videoBlock, ...existing];
}

export function hydrateSubLessonBlocks(sub = {}) {
  const sourceBlocks = Array.isArray(sub.blocks)
    ? sub.blocks.map((block, idx) => normalizeParsedBlock(block, idx))
    : parseSubLessonContent(sub.description);
  const blocks = migrateLegacyVideoIntoBlocks(
    sourceBlocks,
    sub.videoUrl,
    sub.videoName,
  );

  return {
    ...sub,
    blocks,
    description: serializeSubLessonContent(blocks),
  };
}

/**
 * Creates a new content block with defaults
 */
export function createBlock(type, initial = {}) {
  const id = initial.id || generateBlockId();

  switch (type) {
    case BLOCK_TYPES.IMAGE:
      return {
        id,
        type: BLOCK_TYPES.IMAGE,
        url: initial.url || "",
        file: initial.file || null,
        caption: initial.caption || "",
        alt: initial.alt || "Diagram illustration",
        ...initial,
      };

    case BLOCK_TYPES.VIDEO:
      return {
        id,
        type: BLOCK_TYPES.VIDEO,
        url: initial.url || "",
        file: initial.file || null,
        caption: initial.caption || "",
        ...initial,
      };

    case BLOCK_TYPES.CALLOUT:
      return {
        id,
        type: BLOCK_TYPES.CALLOUT,
        title: initial.title || "เนื้อหาเสริม",
        content: initial.content || "",
        variant: initial.variant || "info", // "info" | "tip" | "warning"
        ...initial,
      };

    case BLOCK_TYPES.TEXT:
    default:
      return {
        id,
        type: BLOCK_TYPES.TEXT,
        content: initial.content || "",
        ...initial,
      };
  }
}

/**
 * Parses description into a list of normalized content blocks.
 * Backward compatible with plain text and legacy descriptions.
 */
export function parseSubLessonContent(raw) {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((item, idx) => normalizeParsedBlock(item, idx));
  }

  if (typeof raw === "object" && raw !== null) {
    if (Array.isArray(raw.blocks)) {
      return parseSubLessonContent(raw.blocks);
    }
    return [createBlock(BLOCK_TYPES.TEXT, { content: String(raw) })];
  }

  const str = String(raw).trim();
  if (!str) {
    return [];
  }

  // Try parsing as JSON array of blocks
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => normalizeParsedBlock(item, idx));
      }
    } catch {
      // Fall through to plain text
    }
  }

  // Plain string or markdown fallback
  return [
    createBlock(BLOCK_TYPES.TEXT, {
      content: str,
    }),
  ];
}

/**
 * Serializes block list into string representation for database storage.
 */
export function serializeSubLessonContent(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return "";
  }

  const cleanBlocks = blocks.map((b) => {
    const { file, ...rest } = b;
    return rest;
  });

  const hasRichBlocks = cleanBlocks.some(
    (b) =>
      b.type === BLOCK_TYPES.IMAGE ||
      b.type === BLOCK_TYPES.VIDEO ||
      b.type === BLOCK_TYPES.CALLOUT,
  );

  if (cleanBlocks.length === 1 && cleanBlocks[0].type === BLOCK_TYPES.TEXT && !hasRichBlocks) {
    return cleanBlocks[0].content || "";
  }

  return JSON.stringify(cleanBlocks);
}

/**
 * Helper to move block in array
 */
export function moveBlock(blocks, fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex < 0 ||
    toIndex >= blocks.length ||
    fromIndex === toIndex
  ) {
    return blocks;
  }

  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
