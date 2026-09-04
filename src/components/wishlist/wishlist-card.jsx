"use client";

import { useEffect, useState } from "react";
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
  href,
  progress,
  onRemove,
  isRemoving = false,
  initiallySaved = false,
  isEnrolled = false,
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

  const isCurrentlyEnrolled =
    Boolean(isEnrolled) ||
    Boolean(
      course?.isEnrolled ||
        course?.isSubscribed ||
        course?.enrolled ||
        course?.enrollmentId,
    );

  const [enrolledEvent, setEnrolledEvent] = useState(null);
  const [savedOverride, setSavedOverride] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const enrolled = enrolledEvent !== null ? enrolledEvent : isCurrentlyEnrolled;
  const saved = savedOverride !== null ? savedOverride : initiallySaved;

  useEffect(() => {
    function handleWishlistChange(event) {
      const detail = event?.detail;
      if (detail?.courseId === id) {
        if (detail.action === "add") {
          setSavedOverride(true);
        } else if (detail.action === "remove") {
          setSavedOverride(false);
        }
        if (
          detail.enrolled ||
          detail.action === "enroll" ||
          detail.action === "purchase"
        ) {
          setEnrolledEvent(true);
          setSavedOverride(false);
        }
      }
    }

    window.addEventListener("courseflow:wishlist-change", handleWishlistChange);
    return () => {
      window.removeEventListener("courseflow:wishlist-change", handleWishlistChange);
    };
  }, [id]);

  const displayDescription = summary || description || "";
  const displayTime = formatLearningTime(totalLearningTime);
  const displayProgress = Math.min(
    100,
    Math.max(0, Number.isFinite(Number(progress)) ? Math.round(Number(progress)) : 0),
  );

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

    if (isPending || enrolled) return;
    setIsPending(true);

    try {
      if (saved) {
        await removeCourseFromWishlist(id);
        setSavedOverride(false);
        router.refresh();
        toast.success(`Removed "${title || "Course"}" from your wishlist`);
      } else {
        await addCourseToWishlist(id);
        setSavedOverride(true);
        router.refresh();
        toast.success(`Added "${title || "Course"}" to your wishlist`, {
          action: {
            label: "View Wishlist",
            onClick: () => router.push("/wishlist"),
          },
        });
      }
    } catch (error) {
      const msg =
        error.message ||
        (saved
          ? `Failed to remove ${title || "course"} from your wishlist.`
          : `Failed to add ${title || "course"} to your wishlist.`);

      if (
        msg.toLowerCase().includes("unauthenticated") ||
        msg.toLowerCase().includes("log in") ||
        msg.toLowerCase().includes("session")
      ) {
        toast.error("Please log in to save courses to your wishlist", {
          action: {
            label: "Log in",
            onClick: () => router.push("/login"),
          },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsPending(false);
    }
  }

  function handleSubscribeClick(event) {
    event.preventDefault();
    event.stopPropagation();
    router.push(`/courses/${encodeURIComponent(code || id)}`);
  }

  // `w-full` is what keeps every card the same size. Every consumer renders the
  // card inside a `display:flex` cell, where a flex item sizes to its content on
  // the main axis — so a card with little text collapsed to a narrower box,
  // which in turn shrank its aspect-ratio thumbnail and pulled the price and
  // meta rows upward. Stretch only ever equalised height, never width.
  return (
    <Link
      href={href || `/courses/${encodeURIComponent(code || id)}`}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        {!enrolled && onRemove ? (
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
        ) : !enrolled ? (
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
        ) : null}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-body3 font-medium text-orange-500">Course</p>
        {/*
          Both text blocks clamp to 2 lines AND reserve those 2 lines, so a
          one-word title sits in the same box as a wrapping one and everything
          below stays aligned. `2lh` is exactly two line boxes of each element's
          own computed line-height, so the reserve tracks the type tokens (and
          `leading-relaxed` here) without hard-coded pixels.
        */}
        <h2 className="mt-1 line-clamp-2 min-h-[2lh] text-headline3 font-medium text-black transition-colors group-hover:text-blue-500">
          {title}
        </h2>
        {/* Always rendered — an absent summary must still hold its space. */}
        <p className="mt-2 line-clamp-2 min-h-[2lh] text-body3 leading-relaxed text-gray-700">
          {displayDescription}
        </p>

        {/*
          Fixed-height slot so the price variant and the progress variant end at
          the same offset, keeping the divider and meta row aligned everywhere.
        */}
        {progress === undefined ? (
          <p className="mt-4 flex min-h-10 items-end text-headline3 font-medium text-gray-900">
            THB {formatPrice(price)}
          </p>
        ) : (
          <div className="mt-4 flex min-h-10 flex-col justify-end">
            <p className="text-body3 font-medium text-black">
              {displayProgress}% Complete
            </p>
            <div
              className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-300"
              role="progressbar"
              aria-valuenow={displayProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${title} progress`}
            >
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        )}

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
