"use client";

import { Info, AlertTriangle, Lightbulb, ExternalLink } from "lucide-react";
import {
  BLOCK_TYPES,
  getImageSrc,
  getVideoEmbedInfo,
  parseSubLessonContent,
  sanitizeVideoCaption,
} from "@/lib/sub-lesson-blocks";
import { cn } from "@/lib/utils";

/**
 * Parses and formats inline text with bullet points and keyword highlighting
 */
function FormattedTextBlock({ text, className }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div
      className={cn(
        "space-y-3.5 text-sm sm:text-[15px] leading-relaxed text-gray-700",
        className,
      )}
    >
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
              <span className="select-none text-base text-blue-500 shrink-0 leading-tight">
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
  const tokenRegex =
    /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;
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
                className="inline-flex items-center gap-1 font-semibold text-blue-500 underline underline-offset-2 hover:text-blue-400 transition-colors"
              >
                <span>{linkText}</span>
                <ExternalLink className="size-3 inline shrink-0" aria-hidden />
              </a>
            );
          }
        }

        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-black">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-blue-600"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        if (part.startsWith("[[") && part.endsWith("]]")) {
          return (
            <span key={index} className="font-semibold text-blue-500">
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
  const src = getImageSrc(url);
  if (!src) return null;

  return (
    <figure className="my-6 mx-auto flex flex-col items-center">
      <div className="relative flex w-full max-w-2xl items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
        <img
          src={src}
          alt={alt || caption || "Lesson diagram"}
          className="max-h-[380px] w-auto max-w-full rounded-lg object-contain"
          loading="lazy"
        />
      </div>
      {caption ? (
        <figcaption className="mt-2.5 text-center text-xs text-gray-500">
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

  const visibleCaption = sanitizeVideoCaption(caption);

  return (
    <div className="my-6 mx-auto w-full max-w-3xl">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-card">
        {embed.type === "youtube" || embed.type === "vimeo" ? (
          <iframe
            src={embed.embedUrl}
            title={visibleCaption || "Lesson Video"}
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
      {visibleCaption ? (
        <p className="mt-2 text-center text-xs text-gray-500">{visibleCaption}</p>
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
        bg: "bg-orange-100 border-orange-100",
        icon: "text-orange-500",
        title: "text-orange-500",
        text: "text-gray-700",
      }
    : isTip
      ? {
          bg: "bg-status-submitted border-green/30",
          icon: "text-green",
          title: "text-green",
          text: "text-gray-700",
        }
      : {
          bg: "bg-blue-100 border-blue-200",
          icon: "text-blue-500",
          title: "text-blue-700",
          text: "text-gray-700",
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
        <h4
          className={cn(
            "text-xs sm:text-sm font-bold tracking-wide",
            styles.title,
          )}
        >
          {title}
        </h4>
      </div>
      <div className={cn("leading-relaxed", styles.text)}>
        <FormattedTextBlock
          text={content}
          className="space-y-2.5 text-xs sm:text-sm text-inherit"
        />
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
            return <FormattedTextBlock key={block.id} text={block.content} />;
        }
      })}
    </div>
  );
}
