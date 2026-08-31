import { normalizeCourseCode } from "@/lib/course-validation";
import { sortItems } from "@/lib/sorting";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_COVER = "/courses/service-design.svg";
const COVER_BUCKET = "course-covers";
const TRAILER_BUCKET = "course-trailers";
const ATTACHMENT_BUCKET = "course-attachments";

const COURSE_DETAIL_COLUMNS =
  "id, title, course_code, summary, description, price, is_active, cover_image_url, cover_file_url, video_trailer_url";
const COURSE_DETAIL_WITH_LESSONS = `${COURSE_DETAIL_COLUMNS}, lessons ( id, title, sort_order, sub_lessons ( id, title, sort_order ) )`;

function toPublicStorageUrl(objectPath, supabaseUrl) {
  const base = String(supabaseUrl ?? "").replace(/\/$/, "");
  if (!base || !objectPath) {
    return null;
  }

  const encodedPath = String(objectPath)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `${base}/storage/v1/object/public/${encodedPath}`;
}

export function resolveCoverFileUrl(
  coverFileUrl,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const value = String(coverFileUrl ?? "").trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }

  const objectPath = value.startsWith(`${COVER_BUCKET}/`)
    ? value
    : `${COVER_BUCKET}/${value}`;

  return toPublicStorageUrl(objectPath, supabaseUrl);
}

export function resolveCoverUrl(
  coverFileUrl,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  return resolveCoverFileUrl(coverFileUrl, supabaseUrl) || FALLBACK_COVER;
}

export function resolveTrailerUrl(
  videoTrailerUrl,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const value = String(videoTrailerUrl ?? "").trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }

  const objectPath = value.startsWith(`${TRAILER_BUCKET}/`)
    ? value
    : `${TRAILER_BUCKET}/${value}`;

  return toPublicStorageUrl(objectPath, supabaseUrl);
}

export async function resolveAttachmentHref(supabase, fileUrl) {
  const value = String(fileUrl ?? "").trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }

  const objectPath = value.startsWith(`${ATTACHMENT_BUCKET}/`)
    ? value.slice(ATTACHMENT_BUCKET.length + 1)
    : value;

  if (typeof supabase?.storage?.from === "function") {
    const { data } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(objectPath, 60 * 60);

    if (data?.signedUrl) {
      return data.signedUrl;
    }
  }

  const objectWithBucket = value.startsWith(`${ATTACHMENT_BUCKET}/`)
    ? value
    : `${ATTACHMENT_BUCKET}/${objectPath}`;
  return toPublicStorageUrl(
    objectWithBucket,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

function attachmentObjectPath(fileUrl) {
  const value = String(fileUrl ?? "").trim();
  if (!value || /^https?:\/\//i.test(value) || value.startsWith("/")) {
    return null;
  }

  return value.startsWith(`${ATTACHMENT_BUCKET}/`)
    ? value.slice(ATTACHMENT_BUCKET.length + 1)
    : value;
}

async function getAttachmentFileSize(supabase, fileUrl) {
  const objectPath = attachmentObjectPath(fileUrl);
  if (!objectPath || typeof supabase?.storage?.from !== "function") {
    return null;
  }

  const slash = objectPath.lastIndexOf("/");
  const folder = slash === -1 ? "" : objectPath.slice(0, slash);
  const fileName = slash === -1 ? objectPath : objectPath.slice(slash + 1);

  try {
    const { data } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .list(folder, {
        search: fileName,
        limit: 20,
      });
    const match = Array.isArray(data)
      ? data.find((item) => item.name === fileName)
      : null;
    const size = match?.metadata?.size ?? match?.size;
    return Number.isFinite(Number(size)) ? Number(size) : null;
  } catch {
    return null;
  }
}

export async function getCourseAttachment(supabase, courseId) {
  if (!courseId) {
    return null;
  }

  const query = supabase
    .from("materials")
    .select("id, name, file_url, file_type, sub_lesson_id")
    .eq("course_id", courseId);

  const { data, error } =
    typeof query.is === "function"
      ? await query.is("sub_lesson_id", null)
      : await query;

  if (error) {
    return null;
  }

  const rows = Array.isArray(data) ? data : [];
  const row =
    rows.find((item) => item.sub_lesson_id == null) ?? rows[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name ?? "Attachment",
    fileUrl: await resolveAttachmentHref(supabase, row.file_url),
    fileType: row.file_type ?? "",
    fileSize: await getAttachmentFileSize(supabase, row.file_url),
  };
}

export { FALLBACK_COVER };

export function embeddedCount(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return 0;
    if (typeof value[0] === "number") return value[0];
    if (typeof value[0]?.count === "number") return value[0].count;
    return value.length;
  }
  if (value && typeof value === "object") {
    if (typeof value.count === "number") return value.count;
  }
  return 0;
}

export const CATALOG_DEBOUNCE_MS = 300;
export const CATALOG_SEARCH_MAX_LENGTH = 100;
export const CATALOG_MOBILE_MAX_PX = 760;
export const CATALOG_COLUMNS =
  "id, course_code, title, summary, cover_image_url, cover_file_url, total_learning_time, price, is_active, created_at, updated_at, lessons(count)";

export function catalogPageSizeFromWidth(width) {
  return Number(width) <= CATALOG_MOBILE_MAX_PX ? 6 : 12;
}

export function parseCatalogPageSize(value) {
  const n = Number(value);
  return n === 6 || n === 12 ? n : null;
}

export function catalogRange(page, pageSize) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function isCatalogSearchQueryTooLong(query) {
  return String(query ?? "").trim().length > CATALOG_SEARCH_MAX_LENGTH;
}

export function catalogSearchFilter(query) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const escaped = trimmed
    .replace(/[(),"]/g, " ")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");

  return `title.ilike.%${escaped}%,summary.ilike.%${escaped}%`;
}

const CATALOG_COLUMN_SORTS = {
  title: "title",
  price: "price",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

export function parseCatalogSortBy(value) {
  const key = String(value ?? "").trim();
  if (
    key === "lessonCount" ||
    key === "hours" ||
    Object.hasOwn(CATALOG_COLUMN_SORTS, key)
  ) {
    return key;
  }
  return "createdAt";
}

export function parseCatalogSortDirection(value) {
  return value === "asc" || value === "desc" ? value : "desc";
}

function catalogMemorySortValue(row, sortBy) {
  if (sortBy === "lessonCount") {
    return embeddedCount(row?.lessons);
  }
  const hours = Number(row?.total_learning_time);
  return Number.isFinite(hours) ? hours : null;
}

export function mapCatalogCourse(row) {
  const hours = Number(row?.total_learning_time);
  const code = row?.course_code || row?.id || "";

  return {
    id: row?.id,
    code,
    courseCode: code,
    title: row?.title ?? "",
    summary: row?.summary ?? "",
    coverUrl: resolveCoverUrl(row?.cover_image_url || row?.cover_file_url),
    lessonCount: embeddedCount(row?.lessons),
    hours: Number.isFinite(hours) && hours > 0 ? hours : 0,
    totalLearningTime: row?.total_learning_time ?? "",
    price: row?.price ?? 0,
  };
}

export function catalogRequestUrl({
  query,
  page,
  pageSize,
  sortBy,
  sortDirection,
  includeUserState = false,
}) {
  const params = new URLSearchParams({
    q: String(query ?? "").trim(),
    page: String(page),
    pageSize: String(pageSize),
    sortBy: parseCatalogSortBy(sortBy),
    sortDirection: parseCatalogSortDirection(sortDirection),
  });

  if (includeUserState) params.set("includeUserState", "1");

  return `/api/courses?${params}`;
}

export async function getCatalogCourses(
  supabase,
  {
    query = "",
    page = 1,
    pageSize = 12,
    excludeCourseIds = [],
    sortBy,
    sortDirection,
  } = {},
) {
  const resolvedPageSize = parseCatalogPageSize(pageSize);
  const pageNumber = Number(page);

  if (
    resolvedPageSize == null ||
    !Number.isInteger(pageNumber) ||
    pageNumber < 1
  ) {
    throw new Error("Invalid catalog page");
  }

  const { from, to } = catalogRange(pageNumber, resolvedPageSize);
  const filter = catalogSearchFilter(query);
  const uniqueExcludeIds = [
    ...new Set(
      (Array.isArray(excludeCourseIds) ? excludeCourseIds : [])
        .map((id) => String(id).trim())
        .filter(Boolean),
    ),
  ];
  const resolvedSortBy = parseCatalogSortBy(sortBy);
  const resolvedDirection = parseCatalogSortDirection(sortDirection);

  let request = supabase
    .from("courses")
    .select(CATALOG_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  if (uniqueExcludeIds.length > 0) {
    request = request.not("id", "in", `(${uniqueExcludeIds.join(",")})`);
  }

  if (filter) {
    request = request.or(filter);
  }

  // Loads matching rows (capped by PostgREST max-rows, typically 1000) then
  // sorts/slices in process — acceptable at current catalog size; a persisted
  // lesson_count column would be needed to paginate in the database.
  if (resolvedSortBy === "lessonCount" || resolvedSortBy === "hours") {
    const { data, error, count } = await request.order("id", {
      ascending: true,
    });
    if (error) {
      throw error;
    }
    const sorted = sortItems(data ?? [], {
      type: "number",
      direction: resolvedDirection,
      getValue: (row) => catalogMemorySortValue(row, resolvedSortBy),
    });
    return {
      courses: sorted.slice(from, to + 1).map(mapCatalogCourse),
      total: count ?? 0,
    };
  }

  const column = CATALOG_COLUMN_SORTS[resolvedSortBy];
  const { data, error, count } = await request
    .order(column, {
      ascending: resolvedDirection === "asc",
      nullsFirst: false,
    })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    courses: (data ?? []).map(mapCatalogCourse),
    total: count ?? 0,
  };
}

export async function getOtherInterestingCourses(
  supabase,
  { excludeCourseId, userId, limit = 3 } = {},
) {
  if (!supabase) {
    return [];
  }

  const excludeIds = new Set();
  const currentId = String(excludeCourseId ?? "").trim();
  if (currentId) {
    excludeIds.add(currentId);
  }

  const enrolledUserId = String(userId ?? "").trim();
  if (enrolledUserId) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", enrolledUserId);

    for (const row of enrollments ?? []) {
      const courseId = String(row?.course_id ?? "").trim();
      if (courseId) {
        excludeIds.add(courseId);
      }
    }
  }

  let request = supabase
    .from("courses")
    .select(CATALOG_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const ids = [...excludeIds];
  if (ids.length === 1) {
    request = request.neq("id", ids[0]);
  } else if (ids.length > 1) {
    request = request.not("id", "in", `(${ids.join(",")})`);
  }

  const { data, error } = await request;

  if (error) {
    return [];
  }

  return (data ?? []).map(mapCatalogCourse);
}

function mapCourse(row) {
  return {
    id: row.id,
    title: row.title,
    course_code: row.course_code ?? "",
    cover_file_url: resolveCoverUrl(row.cover_image_url || row.cover_file_url),
    cover_file_type: row.cover_file_type,
    price: row.price ?? 0,
    lesson_count: embeddedCount(row.lessons),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

function sortByOrder(items) {
  return [...items].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
}

export function mapCourseDetail(row) {
  const lessons = sortByOrder(row.lessons ?? []).map((lesson) => ({
    id: lesson.id,
    title: lesson.title ?? "",
    subLessons: sortByOrder(lesson.sub_lessons ?? []).map((subLesson) => ({
      id: subLesson.id,
      title: subLesson.title ?? "",
    })),
  }));

  return {
    id: row.id,
    title: row.title ?? "",
    courseCode: row.course_code ?? "",
    summary: row.summary ?? "",
    description: row.description ?? "",
    price: row.price ?? 0,
    isActive: row.is_active !== false,
    coverUrl: resolveCoverUrl(row.cover_image_url || row.cover_file_url),
    trailerUrl: resolveTrailerUrl(row.video_trailer_url),
    lessons,
  };
}

async function fetchLessonsForCourse(supabase, courseId) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, sort_order, sub_lessons ( id, title, sort_order )")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) {
    return [];
  }

  return data ?? [];
}

function isCourseCodeMatch(row, normalized) {
  return (
    normalizeCourseCode(row?.course_code) === normalized ||
    String(row?.id ?? "").toLowerCase() === normalized
  );
}

async function fetchCourseRowByCode(supabase, select, normalized) {
  const { data, error } = await supabase
    .from("courses")
    .select(select)
    .ilike("course_code", normalized)
    .limit(1)
    .maybeSingle();

  if (!error && data && isCourseCodeMatch(data, normalized)) {
    return data;
  }

  // Fallback: match by course id
  const { data: byId, error: idError } = await supabase
    .from("courses")
    .select(select)
    .eq("id", normalized)
    .limit(1)
    .maybeSingle();

  if (!idError && byId) {
    return byId;
  }

  return null;
}

export async function getCourseByCode(supabase, code, catalogSupabase) {
  const normalized = normalizeCourseCode(code);
  if (!normalized) {
    return null;
  }

  const catalog = catalogSupabase ?? supabase;

  const data = await fetchCourseRowByCode(
    supabase,
    COURSE_DETAIL_WITH_LESSONS,
    normalized,
  );

  if (data) {
    const nestedLessons = Array.isArray(data.lessons) ? data.lessons : [];
    if (nestedLessons.length > 0) {
      return mapCourseDetail(data);
    }

    const lessons = await fetchLessonsForCourse(catalog, data.id);
    return mapCourseDetail({ ...data, lessons });
  }

  const course = await fetchCourseRowByCode(
    supabase,
    COURSE_DETAIL_COLUMNS,
    normalized,
  );

  if (!course) {
    return null;
  }

  const lessons = await fetchLessonsForCourse(catalog, course.id);
  return mapCourseDetail({ ...course, lessons });
}

export async function getCourses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, course_code, cover_file_url, cover_file_type, cover_image_url, price, created_at, updated_at, lessons(count)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCourse);
}

export function searchCourses(courses, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return courses;
  }

  return courses.filter((course) => {
    const title = course.title.toLowerCase();
    const courseCode = (course.course_code ?? "").toLowerCase();

    return (
      title.includes(normalizedQuery) || courseCode.includes(normalizedQuery)
    );
  });
}

export async function deleteCourse(id) {
  const response = await fetch(`/api/admin/courses/${id}`, {
    method: "DELETE",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete this course.");
  }
}
