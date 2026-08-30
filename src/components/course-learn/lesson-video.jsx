"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

function DirectFileVideoPlayer({
  title,
  coverUrl,
  videoUrl,
  className,
  videoClassName = "object-cover",
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const canPlay = Boolean(videoUrl);

  async function handlePlay() {
    if (!canPlay) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  return (
    <section
      aria-label={`${title} video`}
      className={cn("relative aspect-video w-full overflow-hidden", className)}
    >
      {canPlay ? (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 size-full",
            videoClassName,
            !isPlaying && "pointer-events-none",
          )}
          poster={coverUrl || undefined}
          src={videoUrl}
          controls={isPlaying}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
          preload="metadata"
        />
      ) : coverUrl ? (
        <Image
          src={coverUrl}
          alt={`${title} lesson preview`}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gray-300" aria-hidden />
      )}

      {!isPlaying ? (
        <button
          type="button"
          onClick={handlePlay}
          disabled={!canPlay}
          aria-label={
            canPlay ? `Play ${title}` : `Video for ${title} is not available yet`
          }
          className="absolute inset-0 z-10 grid cursor-pointer touch-manipulation place-items-center bg-black/10 disabled:cursor-default"
        >
          <span className="pointer-events-none grid size-16 place-items-center rounded-full bg-gray-900/45 text-white shadow-card sm:size-20">
            <Play className="size-7 fill-white sm:size-8" aria-hidden />
          </span>
        </button>
      ) : null}
    </section>
  );
}

/**
 * Lesson video shell. Plays a real URL when available; otherwise shows
 * the course cover as a thumbnail (mock until learner materials API exists).
 */
function LessonVideo({ title, coverUrl, videoUrl }) {
  return (
    <DirectFileVideoPlayer
      title={title}
      coverUrl={coverUrl}
      videoUrl={videoUrl}
      className="rounded-lg bg-gray-200"
    />
  );
}

export { DirectFileVideoPlayer, LessonVideo };
