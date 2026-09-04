/**
 * Move sub-lesson videos from the public course-trailers bucket into the
 * private course-videos bucket and rewrite every database reference.
 *
 * Course marketing trailers (courses.video_trailer_url) stay where they are —
 * they are meant to be public.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Dashboard → Project Settings → API
 *
 * Apply docs/sql/028_course_videos_bucket.sql first.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-lesson-videos.mjs            # dry run
 *   node --env-file=.env.local scripts/migrate-lesson-videos.mjs --apply
 *   node --env-file=.env.local scripts/migrate-lesson-videos.mjs --apply --delete-source
 *
 * After a prior --apply, --apply --delete-source still removes leftover
 * duplicates from course-trailers (paths that already exist in course-videos,
 * excluding real marketing trailers).
 */

import { createClient } from "@supabase/supabase-js";

const SOURCE_BUCKET = "course-trailers";
const TARGET_BUCKET = "course-videos";

const apply = process.argv.includes("--apply");
const deleteSource = process.argv.includes("--delete-source");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** `course-trailers/<path>` (or a public URL to it) → `<path>`. */
function sourceObjectPath(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("blob:") || raw.startsWith("data:")) {
    return null;
  }

  const marker = `${SOURCE_BUCKET}/`;
  const index = raw.indexOf(marker);
  if (index < 0) {
    return null;
  }

  const path = raw.slice(index + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

function parseBlocks(description) {
  const raw = String(description ?? "").trim();
  if (!raw.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isVideoish(row) {
  const type = String(row?.file_type ?? "").toLowerCase();
  if (type.startsWith("video/") || type === "video") {
    return true;
  }
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(row?.file_url ?? ""));
}

async function fetchAll(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }
  return data ?? [];
}

async function main() {
  const [courses, subLessons, materials] = await Promise.all([
    fetchAll("courses", "id, video_trailer_url"),
    fetchAll("sub_lessons", "id, description"),
    fetchAll("materials", "id, file_url, file_type"),
  ]);

  const trailerPaths = new Set(
    courses.map((row) => sourceObjectPath(row.video_trailer_url)).filter(Boolean),
  );

  // sub_lessons.description holds serialized content blocks
  const subLessonUpdates = [];
  const objectPaths = new Set();

  for (const subLesson of subLessons) {
    const blocks = parseBlocks(subLesson.description);
    if (!blocks) continue;

    let changed = false;
    const nextBlocks = blocks.map((block) => {
      if (block?.type !== "video") return block;

      const path = sourceObjectPath(block.url);
      if (!path) return block;

      objectPaths.add(path);
      changed = true;
      return { ...block, url: `${TARGET_BUCKET}/${path}` };
    });

    if (changed) {
      subLessonUpdates.push({
        id: subLesson.id,
        description: JSON.stringify(nextBlocks),
      });
    }
  }

  // Legacy per-sub-lesson video rows in materials
  const materialUpdates = [];

  for (const material of materials) {
    const path = sourceObjectPath(material.file_url);
    if (!path || !isVideoish(material) || trailerPaths.has(path)) continue;

    objectPaths.add(path);
    materialUpdates.push({
      id: material.id,
      file_url: `${TARGET_BUCKET}/${path}`,
    });
  }

  const paths = [...objectPaths];

  console.log(`Lesson video objects to move: ${paths.length}`);
  console.log(`sub_lessons rows to rewrite: ${subLessonUpdates.length}`);
  console.log(`materials rows to rewrite: ${materialUpdates.length}`);

  // After a previous --apply, DB paths already point at course-videos. In that
  // case --delete-source still cleans leftover copies from course-trailers.
  if (paths.length === 0) {
    if (deleteSource && apply) {
      await deleteLeftoverSources(trailerPaths);
      console.log("Done.");
      return;
    }

    if (deleteSource && !apply) {
      console.log(
        "Dry run: pass --apply --delete-source to remove leftover copies from course-trailers.",
      );
      return;
    }

    console.log("Nothing to do.");
    return;
  }

  if (!apply) {
    for (const path of paths) {
      console.log(`  [dry-run] ${SOURCE_BUCKET}/${path} -> ${TARGET_BUCKET}/${path}`);
    }
    console.log("Dry run only. Re-run with --apply to perform the migration.");
    return;
  }

  const copied = [];

  for (const path of paths) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(SOURCE_BUCKET)
      .download(path);

    if (downloadError || !file) {
      console.error(`  FAILED download ${path}: ${downloadError?.message}`);
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from(TARGET_BUCKET)
      .upload(path, file, {
        contentType: file.type || "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      console.error(`  FAILED upload ${path}: ${uploadError.message}`);
      continue;
    }

    copied.push(path);
    console.log(`  moved ${path}`);
  }

  const copiedSet = new Set(copied);

  for (const update of subLessonUpdates) {
    const { error } = await supabase
      .from("sub_lessons")
      .update({ description: update.description })
      .eq("id", update.id);

    if (error) {
      console.error(`  FAILED sub_lesson ${update.id}: ${error.message}`);
    }
  }

  for (const update of materialUpdates) {
    const { error } = await supabase
      .from("materials")
      .update({ file_url: update.file_url })
      .eq("id", update.id);

    if (error) {
      console.error(`  FAILED material ${update.id}: ${error.message}`);
    }
  }

  if (deleteSource) {
    const removable = copied.filter((path) => !trailerPaths.has(path));
    await removeSourcePaths(removable);
  } else {
    console.log(
      `Left ${copiedSet.size} objects in ${SOURCE_BUCKET}. Re-run with --apply --delete-source once playback is verified.`,
    );
  }

  console.log("Done.");
}

/** List every object path under a storage bucket (recursive). */
async function listAllObjectPaths(bucket) {
  const paths = [];
  const queue = [""];

  while (queue.length > 0) {
    const prefix = queue.shift();
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
    });

    if (error) {
      throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`);
    }

    for (const entry of data ?? []) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders have id === null in Storage list responses.
      if (entry.id === null) {
        queue.push(fullPath);
      } else {
        paths.push(fullPath);
      }
    }
  }

  return paths;
}

async function removeSourcePaths(paths) {
  if (paths.length === 0) {
    console.log(`No leftover objects to delete from ${SOURCE_BUCKET}.`);
    return;
  }

  const { error } = await supabase.storage.from(SOURCE_BUCKET).remove(paths);

  if (error) {
    console.error(`  FAILED delete from ${SOURCE_BUCKET}: ${error.message}`);
    return;
  }

  console.log(`Deleted ${paths.length} source objects from ${SOURCE_BUCKET}.`);
}

/**
 * Remove course-trailers copies that already exist in course-videos, without
 * touching real marketing trailers referenced by courses.video_trailer_url.
 */
async function deleteLeftoverSources(trailerPaths) {
  const [targetPaths, sourcePaths] = await Promise.all([
    listAllObjectPaths(TARGET_BUCKET),
    listAllObjectPaths(SOURCE_BUCKET),
  ]);

  const inTarget = new Set(targetPaths);
  const removable = sourcePaths.filter(
    (path) => inTarget.has(path) && !trailerPaths.has(path),
  );

  console.log(
    `Leftover duplicates in ${SOURCE_BUCKET} (also in ${TARGET_BUCKET}): ${removable.length}`,
  );

  for (const path of removable) {
    console.log(`  delete ${SOURCE_BUCKET}/${path}`);
  }

  await removeSourcePaths(removable);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
