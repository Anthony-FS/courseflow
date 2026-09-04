"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 9;
const ALL_COURSES_HREF = "/courses";

// Matches the card widths the section used before the carousel:
// 1 per row on mobile, 2 from `sm`, 3 from `lg`.
const SLIDE_BASIS = "basis-full sm:basis-1/2 lg:basis-1/3";

// Arrows sit outside the cards once the viewport is wide enough for the
// 1120px container plus a 56px gutter on each side; below that they overlay
// the card edges so they stay reachable on tablet and mobile.
//
// `hidden lg:grid` keeps the arrows to the only breakpoint that shows the full
// three cards. Below `lg` (1 card on mobile, 2 from `sm`) the dots are the sole
// control. Doing this in CSS means the server and first client render agree, so
// there is no hydration mismatch and no layout shift on resize.
const ARROW_BASE =
  "hidden lg:grid z-10 size-10 border-blue-300 bg-white/95 text-blue-500 shadow-card transition duration-200 hover:bg-blue-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * One dot per suggested course at every breakpoint. `loop: true` with
 * `align: "start"` gives Embla one scroll snap per slide, so a dot index and a
 * snap index are the same thing regardless of how many cards are visible.
 */
function CarouselDots({ count, selectedIndex, onSelect }) {
  return (
    <div className="mt-6 flex justify-center gap-0.5">
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === selectedIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={isActive ? "true" : undefined}
            // Padding gives a comfortable click/tap target while the visible
            // dot stays small, so nine dots still read as a compact row.
            className="group grid place-items-center rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span
              className={cn(
                "block size-2 rounded-full transition-all duration-200",
                isActive
                  ? "w-5 bg-blue-500"
                  : "bg-gray-400 group-hover:bg-blue-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function SeeAllCoursesCard() {
  return (
    <Link
      href={ALL_COURSES_HREF}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-gray-200 text-gray-700 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="grid aspect-16/10 w-full place-items-center bg-gray-300">
        <ArrowRight
          className="size-10 text-gray-600 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-body3 font-medium text-gray-600">Course</p>
        <h3 className="mt-1 text-headline3 font-medium text-gray-700 transition-colors group-hover:text-blue-500">
          See All Courses
        </h3>
        <p className="mt-2 text-body3 leading-relaxed text-gray-600">
          No related courses just yet — browse the full catalog instead.
        </p>
        <div className="mt-auto pt-6">
          <div className="h-px w-full bg-gray-400" />
          <p className="pt-4 text-body3 font-medium text-blue-500">
            Browse catalog
          </p>
        </div>
      </div>
    </Link>
  );
}

function OtherInterestingCourses({
  courses = [],
  enrolledCourseIds = [],
  wishlistCourseIds = [],
}) {
  const list = Array.isArray(courses) ? courses.slice(0, MAX_SUGGESTIONS) : [];
  const enrolledSet = new Set(enrolledCourseIds);
  const wishlistSet = new Set(wishlistCourseIds);
  const isEmpty = list.length === 0;

  const [api, setApi] = useState(null);
  // Starts at 0 on both server and client, so the first render matches.
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Drive the active dot from Embla's own `select` event so it stays correct
  // for swipes, drags, arrow clicks and dot clicks alike.
  useEffect(() => {
    if (!api) return undefined;

    const syncSelected = () => setSelectedIndex(api.selectedScrollSnap());

    syncSelected();
    api.on("select", syncSelected);
    api.on("reInit", syncSelected);

    return () => {
      api.off("select", syncSelected);
      api.off("reInit", syncSelected);
    };
  }, [api]);

  const scrollToIndex = useCallback(
    (index) => {
      api?.scrollTo(index);
    },
    [api],
  );

  return (
    <section
      className="bg-gray-100 py-16"
      aria-labelledby="other-interesting-courses-heading"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-280">
        <h2
          id="other-interesting-courses-heading"
          className="text-center text-headline2 font-medium tracking-[-0.02em] text-black"
        >
          Other Interesting Courses
        </h2>

        {isEmpty ? (
          // Keep the section and heading, and hold the card footprint so the
          // page does not shift. No arrows in this state.
          <ul className="mt-10 flex flex-wrap justify-center gap-6">
            <li className="flex w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]">
              <SeeAllCoursesCard />
            </li>
          </ul>
        ) : (
          <Carousel
            setApi={setApi}
            opts={{ loop: true, align: "start" }}
            className="relative mt-10"
          >
            <CarouselContent className="-ml-6">
              {list.map((course) => (
                <CarouselItem
                  key={course.id}
                  className={`pl-6 ${SLIDE_BASIS}`}
                >
                  <WishlistCard
                    course={course}
                    initiallySaved={wishlistSet.has(course.id)}
                    isEnrolled={enrolledSet.has(course.id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              aria-label="Previous courses"
              className={`${ARROW_BASE} left-2 min-[1280px]:-left-14`}
            />
            <CarouselNext
              aria-label="Next courses"
              className={`${ARROW_BASE} right-2 min-[1280px]:-right-14`}
            />
            <CarouselDots
              count={list.length}
              selectedIndex={selectedIndex}
              onSelect={scrollToIndex}
            />
          </Carousel>
        )}
      </div>
    </section>
  );
}

export { OtherInterestingCourses };
