"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
  Paperclip,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  Link as LinkIcon,
  Bold,
  List,
  Code,
} from "lucide-react";
import {
  BLOCK_TYPES,
  createBlock,
  getImageSrc,
  getVideoEmbedInfo,
  moveBlock,
} from "@/lib/sub-lesson-blocks";
import { SubLessonRenderer } from "@/components/course-learn/sub-lesson-renderer";
import { getAdminSignedMediaUrl } from "@/lib/admin-courses";
import { cn } from "@/lib/utils";

/**
 * Lesson videos sit in a private bucket, so previewing an already stored video
 * needs a signed URL from the server. Keyed by the stored `bucket/path` value.
 */
function useLessonVideoPreviews(blocks) {
  const [signedUrls, setSignedUrls] = useState({});
  const requested = useRef(new Set());

  const storedVideoUrls = useMemo(() => {
    const urls = new Set();

    for (const block of blocks ?? []) {
      if (block?.type !== BLOCK_TYPES.VIDEO) continue;
      const embed = getVideoEmbedInfo(block.url);
      if (embed?.storagePath) {
        urls.add(String(block.url).trim());
      }
    }

    return [...urls];
  }, [blocks]);

  useEffect(() => {
    const pending = storedVideoUrls.filter(
      (url) => !requested.current.has(url),
    );
    if (pending.length === 0) return;

    for (const url of pending) {
      requested.current.add(url);
    }

    let cancelled = false;

    Promise.all(
      pending.map(async (url) => {
        try {
          return [url, await getAdminSignedMediaUrl(url)];
        } catch {
          return [url, null];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;

      setSignedUrls((previous) => {
        const next = { ...previous };
        for (const [url, signedUrl] of entries) {
          if (signedUrl) next[url] = signedUrl;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [storedVideoUrls]);

  return signedUrls;
}

/**
 * Text Formatting Helper: Wraps selected text or inserts markdown snippet
 */
function applyTextFormatting(textareaId, currentValue, formatType, onChange) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selectedText = (currentValue || "").substring(start, end);

  let newText = "";
  let cursorOffset = 0;

  switch (formatType) {
    case "link": {
      const url = window.prompt(
        "Enter Link URL / ลิงก์ปลายทาง (e.g. https://example.com):",
        "https://",
      );
      if (url === null) return; // User cancelled
      const text = selectedText || "link text";
      const insertion = `[${text}](${url.trim() || "https://"})`;
      newText =
        (currentValue || "").substring(0, start) +
        insertion +
        (currentValue || "").substring(end);
      cursorOffset = start + insertion.length;
      break;
    }
    case "bold": {
      const text = selectedText || "bold text";
      const insertion = `**${text}**`;
      newText =
        (currentValue || "").substring(0, start) +
        insertion +
        (currentValue || "").substring(end);
      cursorOffset = start + insertion.length;
      break;
    }
    case "highlight": {
      const text = selectedText || "keyword";
      const insertion = `[[${text}]]`;
      newText =
        (currentValue || "").substring(0, start) +
        insertion +
        (currentValue || "").substring(end);
      cursorOffset = start + insertion.length;
      break;
    }
    case "code": {
      const text = selectedText || "code";
      const insertion = `\`${text}\``;
      newText =
        (currentValue || "").substring(0, start) +
        insertion +
        (currentValue || "").substring(end);
      cursorOffset = start + insertion.length;
      break;
    }
    case "bullet": {
      const insertion = `• `;
      newText =
        (currentValue || "").substring(0, start) +
        insertion +
        (currentValue || "").substring(end);
      cursorOffset = start + insertion.length;
      break;
    }
    default:
      return;
  }

  onChange(newText);

  // Restore focus and cursor selection
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorOffset, cursorOffset);
  }, 0);
}

/**
 * Text Format Toolbar (Link, Highlight, Bold, Bullet, Code)
 */
function TextFormatToolbar({ textareaId, currentValue, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-t-lg border-b border-[#D6D9E4] bg-[#F1F3F9] px-2.5 py-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#646D89] mr-1">
        Toolbar:
      </span>
      <button
        type="button"
        onClick={() =>
          applyTextFormatting(textareaId, currentValue, "link", onChange)
        }
        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-[#2F5FAC] border border-[#D6D9E4] hover:bg-[#E2E8F5] transition-colors cursor-pointer shadow-2xs"
        title="ครอบข้อความทำ Hyperlink [text](url)"
      >
        <LinkIcon className="size-3 text-[#2F5FAC]" />
        <span>Link 🔗</span>
      </button>
      <button
        type="button"
        onClick={() =>
          applyTextFormatting(textareaId, currentValue, "highlight", onChange)
        }
        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-[#2563EB] border border-[#D6D9E4] hover:bg-[#EFF6FF] transition-colors cursor-pointer shadow-2xs"
        title="เน้นคำศัพท์สีฟ้า [[keyword]]"
      >
        <Sparkles className="size-3 text-[#2563EB]" />
        <span>Highlight [[H]]</span>
      </button>
      <button
        type="button"
        onClick={() =>
          applyTextFormatting(textareaId, currentValue, "bold", onChange)
        }
        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-bold text-[#1E2235] border border-[#D6D9E4] hover:bg-[#F8F9FD] transition-colors cursor-pointer shadow-2xs"
        title="ตัวหนา **text**"
      >
        <Bold className="size-3 text-[#1E2235]" />
        <span>Bold</span>
      </button>
      <button
        type="button"
        onClick={() =>
          applyTextFormatting(textareaId, currentValue, "bullet", onChange)
        }
        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-[#1E2235] border border-[#D6D9E4] hover:bg-[#F8F9FD] transition-colors cursor-pointer shadow-2xs"
        title="เพิ่ม Bullet •"
      >
        <List className="size-3 text-[#1E2235]" />
        <span>Bullet</span>
      </button>
      <button
        type="button"
        onClick={() =>
          applyTextFormatting(textareaId, currentValue, "code", onChange)
        }
        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-mono text-[#646D89] border border-[#D6D9E4] hover:bg-[#F8F9FD] transition-colors cursor-pointer shadow-2xs"
        title="Code `inline`"
      >
        <Code className="size-3 text-[#646D89]" />
        <span>Code</span>
      </button>
    </div>
  );
}

export function SubLessonBlockBuilder({
  blocks = [],
  onChange,
  subLessonIndex = 0,
}) {
  const [showPreview, setShowPreview] = useState(false);
  const videoPreviewUrls = useLessonVideoPreviews(blocks);

  const previewBlocks = useMemo(
    () =>
      (blocks ?? []).map((block) => {
        const signedUrl = videoPreviewUrls[String(block?.url ?? "").trim()];
        return block?.type === BLOCK_TYPES.VIDEO && signedUrl
          ? { ...block, playbackUrl: signedUrl }
          : block;
      }),
    [blocks, videoPreviewUrls],
  );

  function handleAddBlock(type) {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
  }

  function handleUpdateBlock(index, updates) {
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  }

  function handleDeleteBlock(index) {
    const updated = blocks.filter((_, idx) => idx !== index);
    onChange(updated);
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    onChange(moveBlock(blocks, index, index - 1));
  }

  function handleMoveDown(index) {
    if (index === blocks.length - 1) return;
    onChange(moveBlock(blocks, index, index + 1));
  }

  function handleFileUpload(index, file, mediaKind = "image") {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    if (mediaKind === "attachment") {
      handleUpdateBlock(index, {
        file,
        url: previewUrl,
        name: file.name,
        fileType: file.type,
      });
      return;
    }

    handleUpdateBlock(index, {
      file,
      url: previewUrl,
      fileName: file.name,
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#D6D9E4] bg-white p-4 sm:p-5">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E6ED] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4.5 text-[#2F5FAC]" />
          <span className="text-sm font-bold text-[#1E2235]">
            Sub-Lesson Content Blocks
          </span>
          <span className="rounded-full bg-[#E2E8F5] px-2 py-0.5 text-xs font-semibold text-[#2F5FAC]">
            {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border cursor-pointer",
            showPreview
              ? "bg-[#2F5FAC] text-white border-[#2F5FAC]"
              : "bg-white text-[#646D89] border-[#D6D9E4] hover:bg-[#F8F9FD]",
          )}
        >
          {showPreview ? (
            <>
              <EyeOff className="size-3.5" />
              <span>Hide Preview</span>
            </>
          ) : (
            <>
              <Eye className="size-3.5" />
              <span>Live Preview</span>
            </>
          )}
        </button>
      </div>

      {/* Live Preview Mode */}
      {showPreview ? (
        <div className="rounded-xl bg-[#0D1117] p-5 text-white">
          <p className="mb-4 text-xs font-semibold tracking-wider text-[#9CA3AF] uppercase">
            Student View Preview
          </p>
          <SubLessonRenderer description={JSON.stringify(previewBlocks)} />
        </div>
      ) : null}

      {/* Blocks List */}
      <div className="space-y-3.5">
        {blocks.map((block, index) => {
          const textareaId = `block-textarea-${subLessonIndex}-${index}`;
          const calloutTextareaId = `callout-textarea-${subLessonIndex}-${index}`;
          const imageSrc =
            block.type === BLOCK_TYPES.IMAGE ? getImageSrc(block.url) : null;

          return (
            <div
              key={block.id || index}
              className="relative rounded-xl border border-[#E4E6ED] bg-[#F8F9FD] p-4 transition-all hover:border-[#CBD5E1]"
            >
              {/* Block Header & Action Controls */}
              <div className="flex items-center justify-between gap-2 border-b border-[#E4E6ED] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-5.5 place-items-center rounded-full bg-[#E2E8F5] text-xs font-bold text-[#2F5FAC]">
                    {index + 1}
                  </span>
                  {block.type === BLOCK_TYPES.TEXT && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A2E3F]">
                      <FileText className="size-3.5 text-[#2F5FAC]" /> Text
                      Block
                    </span>
                  )}
                  {block.type === BLOCK_TYPES.IMAGE && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A2E3F]">
                      <ImageIcon className="size-3.5 text-[#10B981]" /> Image /
                      Diagram Card
                    </span>
                  )}
                  {block.type === BLOCK_TYPES.VIDEO && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A2E3F]">
                      <VideoIcon className="size-3.5 text-[#8B5CF6]" /> Video
                      Player
                    </span>
                  )}
                  {block.type === BLOCK_TYPES.CALLOUT && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A2E3F]">
                      <MessageSquare className="size-3.5 text-[#F47E20]" />{" "}
                      Callout Note (เนื้อหาเสริม)
                    </span>
                  )}
                  {block.type === BLOCK_TYPES.ATTACHMENT && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A2E3F]">
                      <Paperclip className="size-3.5 text-[#2F5FAC]" />{" "}
                      Attachment
                    </span>
                  )}
                </div>

                {/* Move & Delete Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="grid size-7 place-items-center rounded text-[#9AA1B9] hover:bg-[#E2E8F5] hover:text-[#2A2E3F] disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === blocks.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="grid size-7 place-items-center rounded text-[#9AA1B9] hover:bg-[#E2E8F5] hover:text-[#2A2E3F] disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(index)}
                    className="grid size-7 place-items-center rounded text-[#9AA1B9] hover:bg-[#FEE2E2] hover:text-[#DC2626] cursor-pointer"
                    title="Delete Block"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Block Body Form Inputs */}
              <div>
                {/* 1. TEXT BLOCK */}
                {block.type === BLOCK_TYPES.TEXT && (
                  <div className="space-y-1.5">
                    <div className="overflow-hidden rounded-lg border border-[#D6D9E4] bg-white focus-within:border-[#2F5FAC] focus-within:shadow-[0_0_0_3px_rgba(47,95,172,0.15)]">
                      <TextFormatToolbar
                        textareaId={textareaId}
                        currentValue={block.content || ""}
                        onChange={(newContent) =>
                          handleUpdateBlock(index, { content: newContent })
                        }
                      />
                      <textarea
                        id={textareaId}
                        rows={4}
                        value={block.content || ""}
                        placeholder="• Type bullet points (start with • or - )&#10;• Use **bold** for strong text&#10;• Use [[keyword]] for highlighted blue terms&#10;• Use [link text](https://...) for hyperlinks"
                        onChange={(e) =>
                          handleUpdateBlock(index, { content: e.target.value })
                        }
                        className="w-full p-3 text-xs sm:text-sm text-[#2A2E3F] outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-[#9AA1B9]">
                      💡 Tip: Select any text and click{" "}
                      <strong className="text-[#2F5FAC]">Link 🔗</strong> to
                      wrap into a hyperlink.
                    </p>
                  </div>
                )}

                {/* 2. IMAGE BLOCK */}
                {block.type === BLOCK_TYPES.IMAGE && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2F5FAC] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#234781]">
                        <Upload className="size-3.5" />
                        <span>Upload Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(index, e.target.files?.[0])
                          }
                        />
                      </label>
                      <span className="text-xs text-[#9AA1B9]">or URL:</span>
                      <input
                        type="text"
                        value={block.url || ""}
                        placeholder="https://example.com/diagram.png"
                        onChange={(e) =>
                          handleUpdateBlock(index, { url: e.target.value })
                        }
                        className="h-9 flex-1 rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs text-[#2A2E3F] outline-none focus:border-[#2F5FAC]"
                      />
                    </div>

                    {imageSrc ? (
                      <div className="relative max-h-48 w-full max-w-sm overflow-hidden rounded-lg border border-[#E4E6ED] bg-white p-2 flex items-center justify-center">
                        <img
                          src={imageSrc}
                          alt={block.alt || block.caption || "Diagram preview"}
                          className="max-h-40 w-auto object-contain"
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={block.caption || ""}
                        placeholder="Caption (Optional)"
                        onChange={(e) =>
                          handleUpdateBlock(index, { caption: e.target.value })
                        }
                        className="h-8.5 rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs text-[#2A2E3F] outline-none focus:border-[#2F5FAC]"
                      />
                      <input
                        type="text"
                        value={block.alt || ""}
                        placeholder="Alt text (e.g. Diagram of program instructions)"
                        onChange={(e) =>
                          handleUpdateBlock(index, { alt: e.target.value })
                        }
                        className="h-8.5 rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs text-[#2A2E3F] outline-none focus:border-[#2F5FAC]"
                      />
                    </div>
                  </div>
                )}

                {/* 3. VIDEO BLOCK */}
                {block.type === BLOCK_TYPES.VIDEO && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#8B5CF6] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#7C3AED]">
                        <Upload className="size-3.5" />
                        <span>Upload Video File</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(index, e.target.files?.[0], "video")
                          }
                        />
                      </label>
                      <span className="text-xs text-[#9AA1B9]">or URL:</span>
                      <input
                        type="text"
                        value={block.url || ""}
                        placeholder="YouTube, Vimeo, or MP4 URL (e.g. https://www.youtube.com/watch?v=...)"
                        onChange={(e) =>
                          handleUpdateBlock(index, { url: e.target.value })
                        }
                        className="h-9 flex-1 rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs text-[#2A2E3F] outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    {block.url
                      ? (() => {
                          const embed = getVideoEmbedInfo(block.url);
                          if (!embed) return null;

                          const directSrc =
                            videoPreviewUrls[String(block.url).trim()] ||
                            embed.src;
                          if (embed.type === "video" && !directSrc) return null;

                          return (
                            <div className="relative aspect-video max-w-sm overflow-hidden rounded-lg bg-black">
                              {embed.type === "youtube" ||
                              embed.type === "vimeo" ? (
                                <iframe
                                  src={embed.embedUrl}
                                  title="Video Preview"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="h-full w-full border-0"
                                />
                              ) : (
                                <video
                                  src={directSrc}
                                  controls
                                  className="h-full w-full object-contain"
                                />
                              )}
                            </div>
                          );
                        })()
                      : null}

                    <input
                      type="text"
                      value={block.caption || ""}
                      placeholder="Video Caption (Optional)"
                      onChange={(e) =>
                        handleUpdateBlock(index, { caption: e.target.value })
                      }
                      className="h-8.5 w-full rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs text-[#2A2E3F] outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                )}

                {/* 5. ATTACHMENT BLOCK */}
                {block.type === BLOCK_TYPES.ATTACHMENT && (
                  <div className="space-y-3">
                    {block.url ? (
                      <div className="flex max-w-md items-center justify-between rounded-xl border border-[#D6D9E4] bg-white p-3.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Paperclip
                            className="size-4 shrink-0 text-[#2F5FAC]"
                            aria-hidden
                          />
                          <span className="truncate text-xs font-medium text-[#2A2E3F]">
                            {block.name || "Attached File"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBlock(index, {
                              url: "",
                              file: null,
                              name: "",
                              fileType: "",
                            })
                          }
                          className="cursor-pointer p-1 text-[#9AA1B9] transition-colors hover:text-[#9B2C6B]"
                          title="Remove Attachment"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex max-w-xs cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#C8CCDB] bg-white px-4 py-2.5 text-xs font-medium text-[#646D89] transition-colors hover:bg-[#F6F7FC]">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(
                              index,
                              e.target.files?.[0],
                              "attachment",
                            )
                          }
                        />
                        <Paperclip className="size-4 text-[#2F5FAC]" aria-hidden />
                        <span>Upload attachment file</span>
                      </label>
                    )}

                    <input
                      type="text"
                      value={block.name || ""}
                      placeholder="Display name (optional)"
                      onChange={(e) =>
                        handleUpdateBlock(index, { name: e.target.value })
                      }
                      className="h-8.5 w-full rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs text-[#2A2E3F] outline-none focus:border-[#2F5FAC]"
                    />
                  </div>
                )}

                {/* 4. CALLOUT BOX (เนื้อหาเสริม) */}
                {block.type === BLOCK_TYPES.CALLOUT && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={block.title || ""}
                        placeholder="Callout Title (e.g. เนื้อหาเสริม)"
                        onChange={(e) =>
                          handleUpdateBlock(index, { title: e.target.value })
                        }
                        className="h-9 w-full sm:w-60 rounded-lg border border-[#D6D9E4] bg-white px-3 text-xs font-semibold text-[#2A2E3F] outline-none focus:border-[#F47E20]"
                      />
                      <select
                        value={block.variant || "info"}
                        onChange={(e) =>
                          handleUpdateBlock(index, { variant: e.target.value })
                        }
                        className="h-9 rounded-lg border border-[#D6D9E4] bg-white px-2.5 text-xs text-[#2A2E3F] outline-none"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="tip">Tip (Green)</option>
                        <option value="warning">Warning (Amber)</option>
                      </select>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-[#D6D9E4] bg-white focus-within:border-[#F47E20] focus-within:shadow-[0_0_0_3px_rgba(244,126,32,0.15)]">
                      <TextFormatToolbar
                        textareaId={calloutTextareaId}
                        currentValue={block.content || ""}
                        onChange={(newContent) =>
                          handleUpdateBlock(index, { content: newContent })
                        }
                      />
                      <textarea
                        id={calloutTextareaId}
                        rows={2.5}
                        value={block.content || ""}
                        placeholder="Type callout note content (e.g. โดยทั่วไปเรามักจะเรียกชุดคำสั่งหลายๆ คำสั่งว่า Code (โค้ด) 💻)..."
                        onChange={(e) =>
                          handleUpdateBlock(index, { content: e.target.value })
                        }
                        className="w-full p-3 text-xs sm:text-sm text-[#2A2E3F] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Block Actions Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E4E6ED]">
        <span className="text-xs font-semibold text-[#646D89] mr-1">
          Insert Block:
        </span>
        <button
          type="button"
          onClick={() => handleAddBlock(BLOCK_TYPES.TEXT)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6D9E4] bg-[#F8F9FD] px-3 py-1.5 text-xs font-semibold text-[#2A2E3F] transition-all hover:bg-[#E2E8F5] hover:text-[#2F5FAC] cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Text / Bullets</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddBlock(BLOCK_TYPES.IMAGE)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6D9E4] bg-[#F8F9FD] px-3 py-1.5 text-xs font-semibold text-[#2A2E3F] transition-all hover:bg-[#E6F4EA] hover:text-[#137333] cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Image / Diagram Card</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddBlock(BLOCK_TYPES.VIDEO)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6D9E4] bg-[#F8F9FD] px-3 py-1.5 text-xs font-semibold text-[#2A2E3F] transition-all hover:bg-[#F5F3FF] hover:text-[#7C3AED] cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Video Player</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddBlock(BLOCK_TYPES.CALLOUT)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6D9E4] bg-[#F8F9FD] px-3 py-1.5 text-xs font-semibold text-[#2A2E3F] transition-all hover:bg-[#FFF7F0] hover:text-[#F47E20] cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Callout Box (เนื้อหาเสริม)</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddBlock(BLOCK_TYPES.ATTACHMENT)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6D9E4] bg-[#F8F9FD] px-3 py-1.5 text-xs font-semibold text-[#2A2E3F] transition-all hover:bg-[#E2E8F5] hover:text-[#2F5FAC] cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Attachment (PDF, Doc, ZIP)</span>
        </button>
      </div>
    </div>
  );
}
