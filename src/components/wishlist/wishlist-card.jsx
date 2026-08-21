import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";

import { formatLearningTime } from "@/lib/wishlist";

export function WishlistCard({ course }) {
  const {
    code,
    title,
    summary,
    description,
    totalLearningTime,
    coverUrl,
    lessonCount = 0,
  } = course;

  const displayDescription = summary || description || "";
  const displayTime = formatLearningTime(totalLearningTime);

  return (
    <Link
      href={`/courses/${encodeURIComponent(code)}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Course Cover Image */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-blue-100">
        <Image
          src={coverUrl}
          alt={title || "Course cover"}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized={coverUrl.endsWith(".svg")}
        />
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-body3 font-medium text-orange-500">Course</p>
        <h2 className="mt-1 text-headline3 font-medium text-black transition-colors group-hover:text-blue-500 line-clamp-1">
          {title}
        </h2>
        {displayDescription ? (
          <p className="mt-2 text-body3 leading-relaxed text-gray-700 line-clamp-2">
            {displayDescription}
          </p>
        ) : null}

        {/* Divider & Metadata */}
        <div className="mt-auto pt-6">
          <div className="h-px w-full bg-gray-300" />
          <div className="flex items-center gap-6 pt-4 text-body3 text-blue-500">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4.5 text-blue-400" aria-hidden />
              <span className="font-normal text-gray-700">{lessonCount} Lesson</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4.5 text-blue-400" aria-hidden />
              <span className="font-normal text-gray-700">{displayTime}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
