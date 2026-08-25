"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { AdminPagination } from "@/components/admin/pagination";
import { CourseCardSkeleton } from "@/components/courses/course-card";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import {
  CATALOG_DEBOUNCE_MS,
  CATALOG_MOBILE_MAX_PX,
  catalogPageSizeFromWidth,
  catalogRequestUrl,
} from "@/lib/courses";
import { getTotalPages } from "@/lib/pagination";

async function loadCatalog({ query, page, pageSize, signal }) {
  const response = await fetch(catalogRequestUrl({ query, page, pageSize }), {
    signal,
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load courses.");
  }

  return body;
}

export function OurCoursesCatalog({ initialWishlistIds = [] }) {
  const [wishlistSet] = useState(() => new Set(initialWishlistIds));
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(null);
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const pageSizeRef = useRef(null);

  useEffect(() => {
    function updatePageSize() {
      const next = catalogPageSizeFromWidth(window.innerWidth);
      const current = pageSizeRef.current;

      if (current !== null && current !== next) {
        setPage(1);
      }

      pageSizeRef.current = next;
      setPageSize(next);
    }

    updatePageSize();
    const media = window.matchMedia(
      `(max-width: ${CATALOG_MOBILE_MAX_PX}px)`,
    );
    media.addEventListener("change", updatePageSize);
    return () => media.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(input.trim());
      setPage(1);
    }, CATALOG_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (pageSize == null) {
      return undefined;
    }

    const controller = new AbortController();

    loadCatalog({
      query: debouncedQuery,
      page,
      pageSize,
      signal: controller.signal,
    })
      .then((result) => {
        setCourses(result.courses ?? []);
        setTotal(result.total ?? 0);
        setErrorMessage("");
        setStatus("ready");
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setErrorMessage(error.message ?? "Failed to load courses.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [debouncedQuery, page, pageSize, reloadKey]);

  const totalPages = getTotalPages(total, pageSize || 12);
  const showPager = status === "ready" && total > 0;
  const skeletonCount = pageSize ?? 12;

  return (
    <div>
      <label className="relative mx-auto mt-10 block max-w-xl">
        <span className="sr-only">Search courses</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-600"
        />
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search..."
          className="h-12 w-full rounded-lg border border-gray-400 bg-white pr-4 pl-12 text-body2"
        />
      </label>

      {errorMessage ? (
        <div className="mt-10 text-center" role="alert">
          <p className="text-body2 text-orange-500">{errorMessage}</p>
          <button
            type="button"
            className="mt-4 text-body2 font-medium text-blue-500"
            onClick={() => {
              setErrorMessage("");
              setStatus("loading");
              setReloadKey((key) => key + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {status === "loading" && courses.length === 0 ? (
        <ul className="mt-16 grid grid-cols-1 gap-6 min-[761px]:grid-cols-3">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <li key={index}>
              <CourseCardSkeleton />
            </li>
          ))}
        </ul>
      ) : null}

      {status !== "error" && courses.length > 0 ? (
        <ul className="mt-16 grid grid-cols-1 gap-6 min-[761px]:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="flex">
              <WishlistCard
                course={course}
                initiallySaved={wishlistSet.has(course.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {status === "ready" && courses.length === 0 ? (
        <p className="mt-16 text-center text-body2 text-gray-700">
          No courses found
        </p>
      ) : null}

      {showPager ? (
        <div className="flex justify-center">
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label="Course catalog pagination"
          />
        </div>
      ) : null}
    </div>
  );
}
