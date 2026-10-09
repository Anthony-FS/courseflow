import { unstable_cache } from "next/cache";

import { getCatalogCourses } from "@/lib/courses";
import { createServiceClient } from "@/lib/supabase/server";

const PUBLIC_CATALOG_CACHE_REVALIDATE_SECONDS = 60;

async function loadPublicCatalogCourses(
  query,
  page,
  pageSize,
  sortBy,
  sortDirection,
) {
  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error("Public catalog cache requires a service client");
  }

  return getCatalogCourses(supabase, {
    query,
    page,
    pageSize,
    sortBy,
    sortDirection,
    excludeCourseIds: [],
  });
}

export const getCachedPublicCatalogCourses = unstable_cache(
  loadPublicCatalogCourses,
  ["public-course-catalog"],
  {
    revalidate: PUBLIC_CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: ["courses"],
  },
);

async function loadMemberCatalogCourses(
  query,
  page,
  pageSize,
  sortBy,
  sortDirection,
  excludeCourseIdsKey,
) {
  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error("Public catalog cache requires a service client");
  }

  const excludeCourseIds = JSON.parse(excludeCourseIdsKey);

  return getCatalogCourses(supabase, {
    query,
    page,
    pageSize,
    sortBy,
    sortDirection,
    excludeCourseIds: Array.isArray(excludeCourseIds) ? excludeCourseIds : [],
  });
}

export const getCachedMemberCatalogCourses = unstable_cache(
  loadMemberCatalogCourses,
  ["member-course-catalog"],
  {
    revalidate: PUBLIC_CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: ["courses"],
  },
);

export function memberCatalogExcludeKey(excludeCourseIds) {
  return JSON.stringify(
    [...new Set(excludeCourseIds ?? [])].map((id) => String(id)).sort(),
  );
}
