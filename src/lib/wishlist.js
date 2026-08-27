import { resolveCoverUrl } from "@/lib/courses";

export async function isCourseWishlisted(supabase, userId, courseId) {
  if (!userId || !courseId) {
    return false;
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data?.id);
}

let clientWishlistCache = null;

export function initWishlistCache(initialIds = []) {
  if (typeof window === "undefined") return;
  if (!clientWishlistCache) {
    clientWishlistCache = new Set(initialIds);
  } else {
    for (const id of initialIds) {
      clientWishlistCache.add(id);
    }
  }
}

export function getActiveWishlistSet(initialIds = []) {
  if (typeof window === "undefined") {
    return new Set(initialIds);
  }
  if (!clientWishlistCache) {
    clientWishlistCache = new Set(initialIds);
  }
  return new Set(clientWishlistCache);
}

export function updateWishlistCache(action, courseId) {
  if (typeof window === "undefined") return;
  if (!clientWishlistCache) {
    clientWishlistCache = new Set();
  }
  if (action === "add" && courseId) {
    clientWishlistCache.add(courseId);
  } else if (action === "remove" && courseId) {
    clientWishlistCache.delete(courseId);
  }
}

export function setWishlistCacheIds(ids = []) {
  if (typeof window === "undefined") return;
  clientWishlistCache = new Set(ids);
}

export function dispatchWishlistChange(detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("courseflow:wishlist-change", { detail }),
    );
  }
}

export async function addCourseToWishlist(courseId) {
  const response = await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to add this course to your wishlist.");
  }

  updateWishlistCache("add", courseId);
  dispatchWishlistChange({ action: "add", courseId });

  return data;
}

export async function removeCourseFromWishlist(courseId) {
  const response = await fetch(`/api/wishlist?courseId=${encodeURIComponent(courseId)}`, {
    method: "DELETE",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to remove this course from your wishlist.");
  }

  updateWishlistCache("remove", courseId);
  dispatchWishlistChange({ action: "remove", courseId });

  return data;
}

export function formatLearningTime(time) {
  if (!time) return "6 Hours";
  const str = String(time).trim();
  if (/hour/i.test(str)) {
    return str;
  }
  const num = parseFloat(str);
  if (isNaN(num)) return str;
  return `${num} ${num === 1 ? "Hour" : "Hours"}`;
}

export async function getUserWishlist(supabase, userId) {
  if (!supabase || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select(`
      id,
      created_at,
      course_id,
      courses (
        id,
        title,
        course_code,
        summary,
        description,
        total_learning_time,
        cover_image_url,
        cover_file_url,
        price,
        lessons ( id )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map((item) => {
      const course = Array.isArray(item.courses) ? item.courses[0] : item.courses;
      if (!course) return null;

      const lessons = course.lessons;
      const lessonCount = Array.isArray(lessons)
        ? lessons.length
        : typeof lessons === "object" && lessons !== null && "count" in lessons
          ? lessons.count
          : 0;

      return {
        wishlistId: item.id,
        id: course.id,
        code: course.course_code || course.id,
        title: course.title || "",
        summary: course.summary || "",
        description: course.description || "",
        totalLearningTime: course.total_learning_time || "",
        coverUrl: resolveCoverUrl(course.cover_image_url || course.cover_file_url),
        price: course.price ?? 0,
        lessonCount,
      };
    })
    .filter(Boolean);
}

export async function getUserWishlistCount(supabase, userId) {
  if (!supabase || !userId) {
    return 0;
  }

  try {
    const { count, data, error } = await supabase
      .from("wishlists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) return 0;
    if (typeof count === "number" && count > 0) return count;
    if (Array.isArray(data)) return data.length;
    return 0;
  } catch {
    return 0;
  }
}

export async function getUserWishlistCourseIds(supabase, userId) {
  if (!supabase || !userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("wishlists")
      .select("course_id")
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((row) => row.course_id).filter(Boolean);
  } catch {
    return [];
  }
}

