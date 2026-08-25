"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, RefreshCw } from "lucide-react";

import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { loadMyCourses } from "@/lib/enrollments";

export function MyCoursesList() {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadCourses() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const loadedCourses = await loadMyCourses();
      setCourses(loadedCourses);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error.message || "Failed to load your courses.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let ignore = false;

    loadMyCourses()
      .then((loadedCourses) => {
        if (ignore) return;
        setCourses(loadedCourses);
        setStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setErrorMessage(error.message || "Failed to load your courses.");
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div
        className="mt-12 flex items-center justify-center gap-3 text-body2 text-gray-700"
        role="status"
      >
        <Loader2 className="size-5 animate-spin text-blue-500" aria-hidden />
        Loading your courses...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center"
        role="alert"
      >
        <p className="text-body2 text-orange-600">{errorMessage}</p>
        <button
          type="button"
          onClick={loadCourses}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 font-medium text-white shadow-button transition duration-200 hover:bg-blue-400"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try Again
        </button>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto mt-12 flex max-w-md flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card sm:p-12">
        <div className="grid size-16 place-items-center rounded-full bg-blue-100 text-blue-500">
          <BookOpen className="size-8" aria-hidden />
        </div>
        <h2 className="mt-4 text-headline3 font-medium text-black">
          You haven’t enrolled in any courses yet.
        </h2>
        <p className="mt-2 text-body2 text-gray-700">
          Browse our catalog and choose a course to start learning.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-blue-500 px-6 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
        >
          Explore Courses
        </Link>
      </div>
    );
  }

  return (
    <ul
      className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Enrolled courses"
    >
      {courses.map((course) => (
        <li key={course.enrollmentId || course.id} className="flex">
          <WishlistCard
            course={course}
            href={`/courses/${encodeURIComponent(course.code)}/learn`}
            progress={course.progress}
          />
        </li>
      ))}
    </ul>
  );
}
