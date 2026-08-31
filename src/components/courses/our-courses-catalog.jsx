"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { AdminPagination } from "@/components/admin/pagination";
import { SortFilterBar } from "@/components/admin/sort-filter-bar";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import {
  CATALOG_DEBOUNCE_MS,
  CATALOG_MOBILE_MAX_PX,
  CATALOG_SEARCH_MAX_LENGTH,
  catalogPageSizeFromWidth,
  catalogRequestUrl,
} from "@/lib/courses";
import { getTotalPages } from "@/lib/pagination";
import {
  getActiveWishlistSet,
  initWishlistCache,
  setWishlistCacheIds,
} from "@/lib/wishlist";
import { createClient } from "@/lib/supabase/client";

const CATALOG_SORT_OPTIONS = [
  {
    value: "lessonCount",
    label: "Lesson count",
    ascendingLabel: "Low to high",
    descendingLabel: "High to low",
  },
  {
    value: "title",
    label: "Course name",
    ascendingLabel: "A-Z",
    descendingLabel: "Z-A",
  },
  {
    value: "price",
    label: "Price",
    ascendingLabel: "Low to high",
    descendingLabel: "High to low",
  },
  {
    value: "createdAt",
    label: "Created date",
    ascendingLabel: "Oldest first",
    descendingLabel: "Newest first",
  },
  {
    value: "updatedAt",
    label: "Updated date",
    ascendingLabel: "Oldest first",
    descendingLabel: "Newest first",
  },
  {
    value: "hours",
    label: "Learning time",
    ascendingLabel: "Low to high",
    descendingLabel: "High to low",
  },
];

async function loadCatalog({
  query,
  page,
  pageSize,
  sortBy,
  sortDirection,
  signal,
}) {
  const response = await fetch(
    catalogRequestUrl({ query, page, pageSize, sortBy, sortDirection }),
    { signal },
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        body.error || "Too many searches, try again in a moment",
      );
    }
    throw new Error(body.error || "Failed to load courses.");
  }

  return body;
}

export function OurCoursesCatalog({
  initialWishlistIds = [],
  enrolledCourseIds = [],
}) {
  initWishlistCache(initialWishlistIds);
  const [wishlistSet, setWishlistSet] = useState(() =>
    getActiveWishlistSet(initialWishlistIds),
  );
  const [enrolledSet, setEnrolledSet] = useState(
    () => new Set(enrolledCourseIds),
  );
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(null);
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const pageSizeRef = useRef(null);

  useEffect(() => {
    setEnrolledSet(new Set(enrolledCourseIds));
  }, [enrolledCourseIds]);

  useEffect(() => {
    async function syncUserData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [{ data: wishlistData }, { data: enrollmentData }] =
            await Promise.all([
              supabase
                .from("wishlists")
                .select("course_id")
                .eq("user_id", user.id),
              supabase
                .from("enrollments")
                .select("course_id")
                .eq("user_id", user.id),
            ]);

          if (wishlistData) {
            const ids = wishlistData.map((r) => r.course_id).filter(Boolean);
            setWishlistCacheIds(ids);
            setWishlistSet(new Set(ids));
          }
          if (enrollmentData) {
            const ids = enrollmentData.map((r) => r.course_id).filter(Boolean);
            setEnrolledSet(new Set(ids));
          }
        }
      } catch {
        // Ignore background sync errors
      }
    }

    syncUserData();
  }, []);

  useEffect(() => {
    function handleWishlistChange(event) {
      const detail = event?.detail;
      if (!detail?.courseId) return;

      setWishlistSet((prev) => {
        const next = new Set(prev);
        if (detail.action === "add") {
          next.add(detail.courseId);
        } else if (detail.action === "remove") {
          next.delete(detail.courseId);
        }
        return next;
      });
    }

    window.addEventListener("courseflow:wishlist-change", handleWishlistChange);
    return () => {
      window.removeEventListener("courseflow:wishlist-change", handleWishlistChange);
    };
  }, []);

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
      sortBy,
      sortDirection,
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
  }, [debouncedQuery, page, pageSize, reloadKey, sortBy, sortDirection]);

  function handleSortChange({
    sortBy: nextSortBy,
    sortDirection: nextDirection,
  }) {
    setSortBy(nextSortBy);
    setSortDirection(nextDirection);
    setPage(1);
  }

  const totalPages = getTotalPages(total, pageSize || 12);
  const showPager = status === "ready" && total > 0;

  return (
    <div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <label className="relative block">
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
            maxLength={CATALOG_SEARCH_MAX_LENGTH}
            className="h-12 w-full max-w-80 rounded-lg border border-gray-400 bg-white pr-4 pl-12 text-body2"
          />
        </label>
        <SortFilterBar
          options={CATALOG_SORT_OPTIONS}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      </div>

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
        <div
          className="mt-16 flex items-center justify-center gap-3 text-body2 text-gray-700"
          role="status"
        >
          <Loader2 className="size-5 animate-spin text-blue-500" aria-hidden />
          Loading courses...
        </div>
      ) : null}

      {status !== "error" && courses.length > 0 ? (
        <ul className="mt-16 grid grid-cols-1 gap-6 min-[761px]:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="flex">
              <WishlistCard
                course={course}
                initiallySaved={wishlistSet.has(course.id)}
                isEnrolled={enrolledSet.has(course.id)}
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
