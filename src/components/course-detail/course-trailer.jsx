"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

function CourseTrailer({ title, coverUrl, trailerUrl }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function handlePlay() {
    if (!trailerUrl) {
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
    <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg bg-gray-200">
      {trailerUrl ? (
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          poster={coverUrl}
          src={trailerUrl}
          controls={isPlaying}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
      ) : (
        <Image
          src={coverUrl}
          alt={`${title} preview`}
          fill
          sizes="(max-width: 1024px) 100vw, 70vw"
          className="object-cover"
          priority
        />
      )}

      {!isPlaying ? (
        <button
          type="button"
          onClick={handlePlay}
          disabled={!trailerUrl}
          aria-label={`Play ${title} trailer`}
          className="absolute inset-0 grid place-items-center bg-black/10 disabled:cursor-default"
        >
          <span className="grid size-20 place-items-center rounded-full bg-gray-900/45 text-white shadow-card">
            <Play className="size-8 fill-white" aria-hidden />
          </span>
        </button>
      ) : null}
    </div>
  );
}

export { CourseTrailer };
