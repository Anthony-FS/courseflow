"use client";

import Image from "next/image";
import { Info, AlertTriangle, Lightbulb, Play, ExternalLink } from "lucide-react";
import { BLOCK_TYPES, getVideoEmbedInfo, parseSubLessonContent } from "@/lib/sub-lesson-blocks";
import { cn } from "@/lib/utils";

/**
 * Parses and formats inline text with bullet points and keyword highlighting
 */
function FormattedTextBlock({ text, className }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className={cn("space-y-3.5 text-sm sm:text-[15px] leading-relaxed text-[#D1D5DB]", className)}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        const isBullet =
          trimmed.startsWith("•") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ");

        const cleanText = isBullet
          ? trimmed.replace(/^[•\-\*]\s*/, "")
          : trimmed;

        return (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-2.5",
              isBullet ? "pl-2 sm:pl-3" : "",
            )}
          >
            {isBullet && (
              <span className="select-none text-base text-[#60A5FA] shrink-0 leading-tight">
                •
              </span>
            )}
            <p className="flex-1">
              <InlineFormattedText content={cleanText} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Handles inline bold (**...**), code (`...`), highlighted terms ([[...]]), and hyperlinks ([text](url))
 */
function InlineFormattedText({ content }) {
  if (!content) return null;

  // Regex to match [link text](url), **bold**, `code`, and [[highlight]]
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;
  const parts = content.split(tokenRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Hyperlink [text](url)
        if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
          const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            const [, linkText, linkUrl] = linkMatch;
            return (
              <a
                key={index}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD] transition-colors"
              >
                <span>{linkText}</span>
                <ExternalLink className="size-3 inline shrink-0" aria-hidden />
              </a>
            );
          }
        }

        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-[#1E293B] px-1.5 py-0.5 font-mono text-xs font-medium text-[#60A5FA]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        if (part.startsWith("[[") && part.endsWith("]]")) {
          return (
            <span key={index} className="font-semibold text-[#4D96FF]">
              {part.slice(2, -2)}
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

/**
 * Renders an Image or Diagram Card
 */
function DiagramImageCard({ url, caption, alt }) {
  if (!url) return null;

  return (
    <figure className="my-6 mx-auto flex flex-col items-center">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-white/10 flex items-center justify-center">
        <img
          src={url}
          alt={alt || caption || "Lesson diagram"}
          className="max-h-[380px] w-auto max-w-full rounded-lg object-contain"
          loading="lazy"
        />
      </div>
      {caption ? (
        <figcaption className="mt-2.5 text-center text-xs text-[#9CA3AF]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Renders a Video Player Block (supports YouTube, Vimeo, and direct video files)
 */
function InlineVideoPlayer({ url, caption }) {
  if (!url) return null;

  const embed = getVideoEmbedInfo(url);
  if (!embed) return null;

  return (
    <div className="my-6 mx-auto w-full max-w-3xl">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg border border-white/10">
        {embed.type === "youtube" || embed.type === "vimeo" ? (
          <iframe
            src={embed.embedUrl}
            title={caption || "Lesson Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <video
            src={embed.src}
            controls
            className="h-full w-full object-contain"
            playsInline
          />
        )}
      </div>
      {caption ? (
        <p className="mt-2 text-center text-xs text-[#9CA3AF]">{caption}</p>
      ) : null}
    </div>
  );
}

/**
 * Renders a Callout / Info Note Box (เนื้อหาเสริม)
 */
function CalloutBox({ title = "เนื้อหาเสริม", content, variant = "info" }) {
  if (!content) return null;

  const isWarning = variant === "warning";
  const isTip = variant === "tip";

  const Icon = isWarning ? AlertTriangle : isTip ? Lightbulb : Info;

  const styles = isWarning
    ? {
        bg: "bg-[#2A1E14] border-[#78350F]",
        icon: "text-[#F59E0B]",
        title: "text-[#FBBF24]",
        text: "text-[#FDE68A]",
      }
    : isTip
      ? {
          bg: "bg-[#14261C] border-[#065F46]",
          icon: "text-[#10B981]",
          title: "text-[#34D399]",
          text: "text-[#A7F3D0]",
        }
      : {
          bg: "bg-[#131E33] border-[#1E3A5F]",
          icon: "text-[#60A5FA]",
          title: "text-[#93C5FD]",
          text: "text-[#E2E8F0]",
        };

  return (
    <div
      className={cn(
        "my-6 rounded-xl border p-4 sm:p-5 shadow-sm transition-all",
        styles.bg,
      )}
      role="note"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("size-4.5 shrink-0", styles.icon)} aria-hidden />
        <h4 className={cn("text-xs sm:text-sm font-bold tracking-wide", styles.title)}>
          {title}
        </h4>
      </div>
      <div className={cn("text-xs sm:text-sm leading-relaxed", styles.text)}>
        <InlineFormattedText content={content} />
      </div>
    </div>
  );
}

/**
 * Main SubLessonRenderer component
 */
export function SubLessonRenderer({ description, className }) {
  const blocks = parseSubLessonContent(description);

  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("sub-lesson-rich-content space-y-6", className)}>
      {blocks.map((block) => {
        switch (block.type) {
          case BLOCK_TYPES.IMAGE:
            return (
              <DiagramImageCard
                key={block.id}
                url={block.url}
                caption={block.caption}
                alt={block.alt}
              />
            );

          case BLOCK_TYPES.VIDEO:
            return (
              <InlineVideoPlayer
                key={block.id}
                url={block.url}
                caption={block.caption}
              />
            );

          case BLOCK_TYPES.CALLOUT:
            return (
              <CalloutBox
                key={block.id}
                title={block.title}
                content={block.content}
                variant={block.variant}
              />
            );

          case BLOCK_TYPES.TEXT:
          default:
            return (
              <FormattedTextBlock
                key={block.id}
                text={block.content}
              />
            );
        }
      })}
    </div>
  );
}
