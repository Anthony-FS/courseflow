export const SUB_LESSON_PROGRESS_EVENT = "courseflow:sub-lesson-progress";
export const SUB_LESSON_COMPLETED_EVENT = SUB_LESSON_PROGRESS_EVENT;

const PROGRESS_ACTIONS = new Set(["visit", "complete", "submit_assignment"]);

function emptyProgress() {
  return {
    visitedIds: [],
    completedIds: [],
    submittedAssignmentIds: [],
  };
}

function mapProgressRows(rows) {
  const visitedIds = [];
  const completedIds = [];
  const submittedAssignmentIds = [];

  for (const row of rows ?? []) {
    const id = row?.sub_lesson_id;
    if (!id) continue;

    if (row.visited_at || row.completed_at || row.assignment_submitted_at) {
      visitedIds.push(id);
    }
    if (row.completed_at) {
      completedIds.push(id);
    }
    if (row.assignment_submitted_at) {
      submittedAssignmentIds.push(id);
    }
  }

  return { visitedIds, completedIds, submittedAssignmentIds };
}

function notifyProgress(courseId, { action, subLessonId } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SUB_LESSON_PROGRESS_EVENT, {
      detail: { courseId, action, subLessonId },
    }),
  );
}

export async function getCourseProgress(supabase, userId, courseId) {
  const user = String(userId ?? "").trim();
  const course = String(courseId ?? "").trim();
  if (!supabase || !user || !course) {
    return emptyProgress();
  }

  const { data, error } = await supabase
    .from("sub_lesson_progress")
    .select(
      "sub_lesson_id, visited_at, completed_at, assignment_submitted_at",
    )
    .eq("user_id", user)
    .eq("course_id", course);

  if (error || !Array.isArray(data)) {
    return emptyProgress();
  }

  return mapProgressRows(data);
}

async function upsertSubLessonProgress(
  supabase,
  { userId, courseId, subLessonId, action },
) {
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("sub_lesson_progress")
    .select("id, completed_at, assignment_submitted_at")
    .eq("user_id", userId)
    .eq("sub_lesson_id", subLessonId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to load progress.");
  }

  const patch = {
    visited_at: now,
    updated_at: now,
  };

  // Only Next Lesson (complete) may set completed_at. Visits must never do so.
  if (action === "complete") {
    patch.completed_at = existing?.completed_at || now;
  }

  if (action === "submit_assignment") {
    patch.assignment_submitted_at =
      existing?.assignment_submitted_at || now;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("sub_lesson_progress")
      .update(patch)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message || "Failed to update progress.");
    }

    return { id: existing.id, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("sub_lesson_progress")
    .insert({
      user_id: userId,
      course_id: courseId,
      sub_lesson_id: subLessonId,
      completed_at: action === "complete" ? now : null,
      assignment_submitted_at:
        action === "submit_assignment" ? now : null,
      ...patch,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message || "Failed to save progress.");
  }

  return { id: inserted?.id ?? null, created: true };
}

export async function recordSubLessonProgress(
  supabase,
  { userId, courseId, subLessonId, action },
) {
  if (!PROGRESS_ACTIONS.has(action)) {
    throw new Error("Invalid progress action.");
  }

  const user = String(userId ?? "").trim();
  const course = String(courseId ?? "").trim();
  const subLesson = String(subLessonId ?? "").trim();

  if (!user || !course || !subLesson) {
    throw new Error("User, course, and sub-lesson are required.");
  }

  return upsertSubLessonProgress(supabase, {
    userId: user,
    courseId: course,
    subLessonId: subLesson,
    action,
  });
}

async function postProgress(courseId, subLessonId, action) {
  const response = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, subLessonId, action }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to save progress.");
  }

  notifyProgress(courseId, { action, subLessonId });
  return data;
}

export function markSubLessonVisited(courseId, subLessonId) {
  return postProgress(courseId, subLessonId, "visit");
}

export function markSubLessonCompleted(courseId, subLessonId) {
  return postProgress(courseId, subLessonId, "complete");
}

export function markAssignmentSubmitted(courseId, subLessonId) {
  return postProgress(courseId, subLessonId, "submit_assignment");
}
