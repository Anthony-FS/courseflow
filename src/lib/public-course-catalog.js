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
