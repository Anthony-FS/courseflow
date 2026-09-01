import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import {
  getCatalogCourses,
  isCatalogSearchQueryTooLong,
  parseCatalogPageSize,
} from "@/lib/courses";
import { getUserEnrolledCourseIds } from "@/lib/enrollments";
import { getCachedPublicCatalogCourses } from "@/lib/public-course-catalog";
import {
  CATALOG_RATE_LIMIT,
  CATALOG_RATE_WINDOW_MS,
  catalogRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const PRIVATE_CATALOG_CACHE_CONTROL =
  "private, no-store, max-age=0, must-revalidate";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") ?? "");
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = parseCatalogPageSize(searchParams.get("pageSize"));
  const sortBy = searchParams.get("sortBy") ?? "";
  const sortDirection = searchParams.get("sortDirection") ?? "";
  const includeUserState = searchParams.get("includeUserState") === "1";

  if (pageSize == null || !Number.isInteger(page) || page < 1) {
    return jsonError("Invalid page or page size", 400);
  }

  if (isCatalogSearchQueryTooLong(query)) {
    return jsonError("Search query is too long", 400);
  }

  const limited = checkRateLimit(catalogRateLimitKey(getClientIp(request)), {
    limit: CATALOG_RATE_LIMIT,
    windowMs: CATALOG_RATE_WINDOW_MS,
  });
  if (!limited.allowed) {
    return jsonTooManyRequests(limited.retryAfterSec);
  }

  const serviceSupabase = createServiceClient();
  let supabase = serviceSupabase;
  if (!supabase) {
    if (process.env.NODE_ENV !== "development") {
      return jsonError("Course catalog is unavailable", 500);
    }
    supabase = await createClient();
  }

  const { user, supabase: sessionSupabase } = await getSessionUser();
  let excludeCourseIds = [];
  let wishlistCourseIds = [];
  if (user) {
    const enrolledPromise = Promise.resolve()
      .then(() => getUserEnrolledCourseIds(sessionSupabase, user.id))
      .catch(() => []);
    const wishlistPromise = includeUserState
      ? Promise.resolve()
          .then(async () => {
            if (!sessionSupabase?.from) return [];
            const { data, error } = await sessionSupabase
              .from("wishlists")
              .select("course_id")
              .eq("user_id", user.id);
            if (error || !Array.isArray(data)) return [];
            return data.map((row) => row?.course_id).filter(Boolean);
          })
          .catch(() => [])
      : Promise.resolve([]);

    [excludeCourseIds, wishlistCourseIds] = await Promise.all([
      enrolledPromise,
      wishlistPromise,
    ]);
  }

  try {
    const result =
      !user && serviceSupabase
        ? await getCachedPublicCatalogCourses(
            query,
            page,
            pageSize,
            sortBy,
            sortDirection,
          )
        : await getCatalogCourses(supabase, {
            query,
            page,
            pageSize,
            excludeCourseIds,
            sortBy,
            sortDirection,
          });
    return jsonOk(
      {
        ...result,
        enrolledCourseIds: excludeCourseIds,
        ...(includeUserState ? { wishlistIds: wishlistCourseIds } : {}),
      },
      {
        headers: {
          // Keep the HTTP response uncached so tag invalidation is visible immediately.
          // The public database result is still cached server-side.
          "Cache-Control": PRIVATE_CATALOG_CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    return jsonError(error.message || "Failed to load courses", 500);
  }
}
