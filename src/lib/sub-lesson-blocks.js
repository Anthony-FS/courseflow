/**
 * Sub-Lesson Rich Content Block Types & Utilities
 */

import {
  lessonVideoObjectPath,
  resolveCoverFileUrl,
  resolveTrailerUrl,
} from "@/lib/courses";

export const BLOCK_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  CALLOUT: "callout",
  ATTACHMENT: "attachment",
};

export function generateBlockId() {
  return (
    "block_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now()
  );
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

  if (isEphemeralMediaUrl(trimmed)) {
    return { type: "video", src: trimmed, storagePath: null };
  }

  // Sub-lesson videos live in a private bucket, so there is no src to build
  // here. The caller supplies a signed URL it obtained server-side.
  const storagePath = lessonVideoObjectPath(trimmed);
  if (storagePath) {
    return { type: "video", src: null, storagePath };
  }

  // Direct video file, legacy public trailer path, or generic stream URL
  return {
    type: "video",
    src: resolveTrailerUrl(trimmed) || trimmed,
    storagePath: null,
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

/**
 * Client-side attachment href for admin blob previews only.
 * Stored paths must be resolved server-side via resolveAttachmentHref.
 */
export function getAttachmentSrc(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isEphemeralMediaUrl(trimmed)) return trimmed;

  return null;
}

function normalizeAttachmentUrl(url) {
  return String(url ?? "").trim();
}

function isUsableLegacyAttachmentUrl(url) {
  const value = normalizeAttachmentUrl(url);
  if (!value || isEphemeralMediaUrl(value)) return false;
  if (/\.(mp4|webm|mov|m4v|avi|mkv|mpeg|mpg)(\?|$)/i.test(value)) return false;
  return true;
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
    return (
      existing === target ||
      existing.endsWith(target) ||
      target.endsWith(existing)
    );
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

function attachmentBlockHasUrl(blocks, url) {
  const target = normalizeAttachmentUrl(url);
  if (!target) return false;

  return (Array.isArray(blocks) ? blocks : []).some((block) => {
    if (block?.type !== BLOCK_TYPES.ATTACHMENT) return false;
    const existing = normalizeAttachmentUrl(block.url);
    if (!existing) return false;
    return (
      existing === target ||
      existing.endsWith(target) ||
      target.endsWith(existing)
    );
  });
}

export function hasAttachmentContentBlock(blocksOrDescription) {
  const blocks = Array.isArray(blocksOrDescription)
    ? blocksOrDescription
    : parseSubLessonContent(blocksOrDescription);

  return blocks.some(
    (block) =>
      block?.type === BLOCK_TYPES.ATTACHMENT &&
      isUsableLegacyAttachmentUrl(block.url),
  );
}

/**
 * Copies an already-uploaded sub-lesson video into a Video Player block.
 * Does not re-upload. No-ops when there is no video, the URL is a local
 * preview, or a matching video block already exists.
 */
export function migrateLegacyVideoIntoBlocks(
  blocks,
  videoUrl,
  _videoName = "",
) {
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

/**
 * Copies an already-uploaded sub-lesson attachment into an Attachment block.
 * Does not re-upload. No-ops when there is no attachment, the URL is a local
 * preview, or a matching attachment block already exists.
 */
export function migrateLegacyAttachmentIntoBlocks(
  blocks,
  attachmentUrl,
  attachmentName = "",
  attachmentType = "",
) {
  const existing = Array.isArray(blocks) ? [...blocks] : [];
  const url = normalizeAttachmentUrl(attachmentUrl);
  if (
    !isUsableLegacyAttachmentUrl(url) ||
    attachmentBlockHasUrl(existing, url)
  ) {
    return existing;
  }

  const attachmentBlock = createBlock(BLOCK_TYPES.ATTACHMENT, {
    url,
    name: String(attachmentName || "").trim() || "Attachment",
    fileType: String(attachmentType || "").trim(),
  });

  // Keep previous learner order: the standalone attachment sat below the content.
  return [...existing, attachmentBlock];
}

export function hydrateSubLessonBlocks(sub = {}) {
  const sourceBlocks = Array.isArray(sub.blocks)
    ? sub.blocks.map((block, idx) => normalizeParsedBlock(block, idx))
    : parseSubLessonContent(sub.description);
  const blocks = migrateLegacyAttachmentIntoBlocks(
    migrateLegacyVideoIntoBlocks(sourceBlocks, sub.videoUrl, sub.videoName),
    sub.attachmentUrl,
    sub.attachmentName,
    sub.attachmentType,
  );
  const attachmentInBlocks = hasAttachmentContentBlock(blocks);
  const videoInBlocks = hasVideoContentBlock(blocks);

  return {
    ...sub,
    blocks,
    description: serializeSubLessonContent(blocks),
    attachmentUrl: attachmentInBlocks ? null : (sub.attachmentUrl ?? null),
    attachmentName: attachmentInBlocks ? "" : (sub.attachmentName ?? ""),
    attachmentFile: null,
    videoUrl: videoInBlocks ? null : (sub.videoUrl ?? null),
    videoName: videoInBlocks ? "" : (sub.videoName ?? ""),
    videoFile: null,
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

    case BLOCK_TYPES.ATTACHMENT:
      return {
        id,
        type: BLOCK_TYPES.ATTACHMENT,
        url: initial.url || "",
        file: initial.file || null,
        name: initial.name || "",
        fileType: initial.fileType || "",
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
      b.type === BLOCK_TYPES.CALLOUT ||
      b.type === BLOCK_TYPES.ATTACHMENT,
  );

  if (
    cleanBlocks.length === 1 &&
    cleanBlocks[0].type === BLOCK_TYPES.TEXT &&
    !hasRichBlocks
  ) {
    return cleanBlocks[0].content || "";
  }

  return JSON.stringify(cleanBlocks);
}

/**
 * Collects stored image/video URLs from sub-lesson block content.
 * Ignores blob/data previews and empty values.
 */
export function collectMediaUrlsFromContent(raw) {
  const blocks = parseSubLessonContent(raw);
  const urls = [];

  for (const block of blocks) {
    if (
      (block.type === BLOCK_TYPES.IMAGE ||
        block.type === BLOCK_TYPES.VIDEO ||
        block.type === BLOCK_TYPES.ATTACHMENT) &&
      block.url &&
      !isEphemeralMediaUrl(block.url)
    ) {
      urls.push(String(block.url).trim());
    }
  }

  return urls;
}

export function collectMediaUrlsFromSubLessonRecords(subLessons = []) {
  const urls = [];

  for (const sub of subLessons ?? []) {
    urls.push(...collectMediaUrlsFromContent(sub?.description));
    if (sub?.videoUrl) urls.push(String(sub.videoUrl).trim());
    if (sub?.attachmentUrl) urls.push(String(sub.attachmentUrl).trim());

    const materials = Array.isArray(sub?.materials)
      ? sub.materials
      : sub?.materials
        ? [sub.materials]
        : [];
    for (const material of materials) {
      if (material?.file_url) urls.push(String(material.file_url).trim());
    }
  }

  return [...new Set(urls.filter(Boolean))];
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
