import { UPLOAD_KINDS } from "@/lib/admin-uploads";

const COURSE_MEDIA_BUCKETS = new Set(
  Object.values(UPLOAD_KINDS).map((kind) => kind.bucket),
);

/**
 * Parse a stored media value into a Storage object reference.
 * Accepts `bucket/path`, bare object path with known bucket prefix, or public URL.
 * @returns {{ bucket: string, path: string } | null}
 */
export function parseStorageObjectRef(fileUrl) {
  const value = String(fileUrl ?? "").trim();
  if (!value) {
    return null;
  }

  let candidate = value;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const marker = "/storage/v1/object/public/";
      const index = url.pathname.indexOf(marker);
      if (index < 0) {
        return null;
      }
      candidate = decodeURIComponent(
        url.pathname.slice(index + marker.length),
      );
    } catch {
      return null;
    }
  }

  const parts = candidate.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const bucket = parts[0];
  if (!COURSE_MEDIA_BUCKETS.has(bucket)) {
    return null;
  }

  return {
    bucket,
    path: parts.slice(1).join("/"),
  };
}

export function groupStorageRefsByBucket(fileUrls) {
  const byBucket = new Map();

  for (const fileUrl of fileUrls) {
    const ref = parseStorageObjectRef(fileUrl);
    if (!ref) continue;

    const key = `${ref.bucket}/${ref.path}`;
    if (!byBucket.has(ref.bucket)) {
      byBucket.set(ref.bucket, new Map());
    }
    byBucket.get(ref.bucket).set(key, ref.path);
  }

  return byBucket;
}

/**
 * Remove Storage objects. Failures are logged and ignored so DB deletes still succeed.
 */
export async function removeStorageObjects(supabase, fileUrls) {
  const byBucket = groupStorageRefsByBucket(fileUrls);
  const removed = [];

  for (const [bucket, pathMap] of byBucket) {
    const paths = [...pathMap.values()];
    if (paths.length === 0) continue;

    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.error(
        `[course-media] Failed to remove from ${bucket}:`,
        error.message || error,
      );
      continue;
    }
    removed.push(...paths.map((path) => `${bucket}/${path}`));
  }

  return removed;
}

async function countOtherCourseMediaRefs(supabase, fileUrl, excludeCourseId) {
  const url = String(fileUrl ?? "").trim();
  if (!url) return 0;

  const [{ count: coverCount }, { count: trailerCount }] = await Promise.all([
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("cover_image_url", url)
      .neq("id", excludeCourseId),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("video_trailer_url", url)
      .neq("id", excludeCourseId),
  ]);

  return (coverCount ?? 0) + (trailerCount ?? 0);
}

async function countOtherMaterialRefs(supabase, fileUrl, excludeCourseId) {
  const url = String(fileUrl ?? "").trim();
  if (!url) return 0;

  const { count } = await supabase
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("file_url", url)
    .neq("course_id", excludeCourseId);

  return count ?? 0;
}

/**
 * Keep shared media (e.g. seed courses reusing BP12 cover) when still referenced.
 */
export async function filterRemovableMediaUrls(
  supabase,
  fileUrls,
  { excludeCourseId },
) {
  const unique = [...new Set((fileUrls ?? []).map((u) => String(u ?? "").trim()).filter(Boolean))];
  const removable = [];

  for (const fileUrl of unique) {
    const [courseRefs, materialRefs] = await Promise.all([
      countOtherCourseMediaRefs(supabase, fileUrl, excludeCourseId),
      countOtherMaterialRefs(supabase, fileUrl, excludeCourseId),
    ]);

    if (courseRefs + materialRefs === 0) {
      removable.push(fileUrl);
    }
  }

  return removable;
}

export async function collectCourseMediaUrls(supabase, courseId) {
  const [{ data: course }, { data: materials }] = await Promise.all([
    supabase
      .from("courses")
      .select("cover_image_url, video_trailer_url")
      .eq("id", courseId)
      .maybeSingle(),
    supabase
      .from("materials")
      .select("file_url")
      .eq("course_id", courseId),
  ]);

  const urls = [];
  if (course?.cover_image_url) urls.push(course.cover_image_url);
  if (course?.video_trailer_url) urls.push(course.video_trailer_url);
  for (const row of materials ?? []) {
    if (row?.file_url) urls.push(row.file_url);
  }
  return urls;
}

export async function cleanupCourseMediaOnDelete(supabase, courseId) {
  const urls = await collectCourseMediaUrls(supabase, courseId);
  const removable = await filterRemovableMediaUrls(supabase, urls, {
    excludeCourseId: courseId,
  });
  return removeStorageObjects(supabase, removable);
}

export async function cleanupReplacedCourseMedia(
  supabase,
  courseId,
  { previousCoverUrl, previousTrailerUrl, previousAttachmentUrl, nextCoverUrl, nextTrailerUrl, nextAttachmentUrl },
) {
  const candidates = [];

  if (
    previousCoverUrl &&
    String(previousCoverUrl).trim() !== String(nextCoverUrl ?? "").trim()
  ) {
    candidates.push(previousCoverUrl);
  }
  if (
    previousTrailerUrl &&
    String(previousTrailerUrl).trim() !== String(nextTrailerUrl ?? "").trim()
  ) {
    candidates.push(previousTrailerUrl);
  }
  if (
    previousAttachmentUrl &&
    String(previousAttachmentUrl).trim() !==
      String(nextAttachmentUrl ?? "").trim()
  ) {
    candidates.push(previousAttachmentUrl);
  }

  const removable = await filterRemovableMediaUrls(supabase, candidates, {
    excludeCourseId: courseId,
  });
  return removeStorageObjects(supabase, removable);
}
