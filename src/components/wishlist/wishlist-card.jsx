"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Bookmark, BookmarkCheck, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/format";
import {
  addCourseToWishlist,
  formatLearningTime,
  removeCourseFromWishlist,
} from "@/lib/wishlist";

export function WishlistCard({
  course,
  onRemove,
  isRemoving = false,
  initiallySaved = false,
  showSubscribeButton = false,
}) {
  const router = useRouter();
  const {
    id,
    code,
    title,
    summary,
    description,
    totalLearningTime,
    coverUrl,
    price = 0,
    lessonCount = 0,
  } = course;

  const [saved, setSaved] = useState(initiallySaved);
  const [isPending, setIsPending] = useState(false);

  const displayDescription = summary || description || "";
  const displayTime = formatLearningTime(totalLearningTime);

  function handleRemoveClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (onRemove && !isRemoving) {
      onRemove(id);
    }
  }

  async function handleBookmarkToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isPending) return;
    setIsPending(true);

    try {
      if (saved) {
        await removeCourseFromWishlist(id);
        setSaved(false);
        toast.success(`Removed "${title}" from your wishlist`);
      } else {
        await addCourseToWishlist(id);
        setSaved(true);
        toast.success(`Added "${title}" to your wishlist`, {
          action: {
            label: "View Wishlist",
            onClick: () => router.push("/wishlist"),
          },
        });
      }
    } catch (error) {
      toast.error(
        error.message ||
          (saved
            ? "Failed to remove course from wishlist"
            : "Please log in to save courses to your wishlist"),
        {
          action: !saved
            ? {
                label: "Log in",
                onClick: () =>
                  router.push(
                    `/login?next=/courses/${encodeURIComponent(code || id)}`,
                  ),
              }
            : undefined,
        },
      );
    } finally {
      setIsPending(false);
    }
  }

  function handleSubscribeClick(event) {
    event.preventDefault();
    event.stopPropagation();
    router.push(`/courses/${encodeURIComponent(code || id)}`);
  }

  return (
    <Link
      href={`/courses/${encodeURIComponent(code || id)}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

        {/* Quick Remove Action Button on Wishlist Page */}
        {onRemove ? (
          <button
            type="button"
            onClick={handleRemoveClick}
            disabled={isRemoving}
            aria-label={`Remove ${title} from wishlist`}
            title="Remove from wishlist"
            className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-orange-500 shadow-card backdrop-blur-xs transition duration-200 hover:scale-110 hover:bg-white hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
          >
            {isRemoving ? (
              <Loader2 className="size-4.5 animate-spin" aria-hidden />
            ) : (
              <BookmarkCheck className="size-5 fill-orange-500/20" aria-hidden />
            )}
          </button>
        ) : (
          /* Interactive Quick Bookmark Button on Catalog / Other Courses */
          <button
            type="button"
            onClick={handleBookmarkToggle}
            disabled={isPending}
            aria-label={saved ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
            aria-pressed={saved}
            title={saved ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-orange-500 shadow-card backdrop-blur-xs transition duration-200 hover:scale-110 hover:bg-white hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4.5 animate-spin" aria-hidden />
            ) : saved ? (
              <BookmarkCheck className="size-5 fill-orange-500/20" aria-hidden />
            ) : (
              <Bookmark className="size-5" aria-hidden />
            )}
          </button>
        )}
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

        {/* Price */}
        <p className="mt-4 text-headline3 font-medium text-gray-900">
          THB {formatPrice(price)}
        </p>

        {/* Optional Direct Subscribe Button */}
        {showSubscribeButton ? (
          <button
            type="button"
            onClick={handleSubscribeClick}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-500 font-medium text-body3 text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Subscribe Course
          </button>
        ) : null}

        {/* Divider & Metadata */}
        <div className="mt-auto pt-6">
          <div className="h-px w-full bg-gray-300" />
          <div className="flex items-center gap-6 pt-4 text-body3 text-blue-500">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4.5 text-blue-400" aria-hidden />
              <span className="font-normal text-gray-700">
                {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}
              </span>
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

