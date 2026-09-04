"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { removeCourseFromWishlist } from "@/lib/wishlist";

export function WishlistCourseList({ initialCourses = [] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [removingId, setRemovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRemove(courseId) {
    if (removingId) return;

    const previousCourses = courses;
    const courseToRemove = courses.find((c) => c.id === courseId);

    // Optimistic removal
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setRemovingId(courseId);
    setErrorMessage("");

    try {
      await removeCourseFromWishlist(courseId);
      toast.success(
        `Removed "${courseToRemove?.title || "Course"}" from your wishlist`,
      );
    } catch (error) {
      // Rollback on error
      setCourses(previousCourses);
      const msg =
        error.message ||
        `Failed to remove ${courseToRemove?.title || "course"} from your wishlist.`;
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      {errorMessage ? (
        <div
          role="alert"
          className="mx-auto mb-6 max-w-md rounded-xl border border-orange-200 bg-orange-50 p-4 text-center text-body3 text-orange-600"
        >
          {errorMessage}
        </div>
      ) : null}

      {courses.length > 0 ? (
        <ul
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Wishlisted courses"
        >
          {courses.map((course) => (
            <li key={course.wishlistId || course.id} className="flex">
              <WishlistCard
                course={course}
                onRemove={handleRemove}
                isRemoving={removingId === course.id}
                isEnrolled={Boolean(course.isEnrolled || course.enrollmentId)}
                showSubscribeButton
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card sm:p-12">
          <div className="grid size-16 place-items-center rounded-full bg-blue-100 text-blue-500">
            <Bookmark className="size-8" aria-hidden />
          </div>
          <h2 className="mt-4 text-headline3 font-medium text-black">
            No courses in your wishlist yet
          </h2>
          <p className="mt-2 text-body2 text-gray-700">
            Browse our catalog and save courses you want to learn later.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-blue-500 px-6 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
          >
            Explore Courses
          </Link>
        </div>
      )}
    </>
  );
}
