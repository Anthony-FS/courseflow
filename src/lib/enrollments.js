import { mockProgressPercent, withMockLessonStatuses } from "@/lib/course-learn";
import { resolveCoverUrl } from "@/lib/courses";
import { dispatchWishlistChange, updateWishlistCache } from "@/lib/wishlist";

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function deleteUserCourseWishlist(supabase, userId, courseId) {
  if (!supabase || !userId || !courseId) return;
  try {
    await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);
  } catch {
    // Ignore wishlist deletion errors
  }
}

export async function enrollUserInCourse(supabase, userId, courseId) {
  if (!userId || !courseId) {
    throw new Error("User id and course id are required.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to load enrollment.");
  }

  if (existing?.id) {
    await deleteUserCourseWishlist(supabase, userId, courseId);
    return { already: true, id: existing.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      await deleteUserCourseWishlist(supabase, userId, courseId);
      return { already: true, id: null };
    }
    throw new Error(insertError.message || "Failed to subscribe to this course.");
  }

  await deleteUserCourseWishlist(supabase, userId, courseId);

  return { already: false, id: inserted?.id ?? null };
}

export async function isCourseEnrolled(supabase, userId, courseId) {
  if (!supabase || !userId || !courseId) {
    return false;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data?.id);
}

export async function getUserEnrolledCourseIds(supabase, userId) {
  if (!supabase || !userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((row) => row.course_id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function enrollInCourse(courseId) {
  const response = await fetch("/api/enrollments", {
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
    throw new Error(data?.error || "Failed to subscribe to this course.");
  }

  updateWishlistCache("remove", courseId);
  dispatchWishlistChange({ action: "remove", courseId, enrolled: true });

  return data;
}

function lessonCount(lessons) {
  if (Array.isArray(lessons)) return lessons.length;
  if (lessons && typeof lessons === "object" && "count" in lessons) {
    return lessons.count;
  }
  return 0;
}

function mapEnrolledCourse(enrollment) {
  const course = Array.isArray(enrollment.courses)
    ? enrollment.courses[0]
    : enrollment.courses;

  if (!course) return null;

  return {
    enrollmentId: enrollment.id,
    enrolledAt: enrollment.subscribed_at,
    id: course.id,
    code: course.course_code || course.id,
    title: course.title || "",
    summary: course.summary || "",
    description: course.description || "",
    totalLearningTime: course.total_learning_time || "",
    coverUrl: resolveCoverUrl(
      course.cover_image_url || course.cover_file_url,
    ),
    price: course.price ?? 0,
    lessonCount: lessonCount(course.lessons),
  };
}

function courseLessonsForProgress(course) {
  return (course.lessons ?? []).map((lesson) => ({
    id: lesson.id,
    subLessons: (lesson.sub_lessons ?? []).map((subLesson) => ({
      id: subLesson.id,
    })),
  }));
}

function mapBatchProgressRows(rows) {
  const progressByCourse = new Map();

  for (const row of rows ?? []) {
    const courseId = row?.course_id;
    const subLessonId = row?.sub_lesson_id;
    if (!courseId || !subLessonId) continue;

    const progress = progressByCourse.get(courseId) ?? {
      visitedIds: [],
      completedIds: [],
      submittedAssignmentIds: [],
    };

    if (row.visited_at || row.completed_at || row.assignment_submitted_at) {
      progress.visitedIds.push(subLessonId);
    }
    if (row.completed_at) {
      progress.completedIds.push(subLessonId);
    }
    if (row.assignment_submitted_at) {
      progress.submittedAssignmentIds.push(subLessonId);
    }

    progressByCourse.set(courseId, progress);
  }

  return progressByCourse;
}

function mapBatchAssignments(rows) {
  const assignmentsByCourse = new Map();
  const assignmentIds = [];

  for (const row of rows ?? []) {
    const courseId = row?.course_id;
    const subLessonId = row?.sub_lesson_id;
    if (!courseId || !row?.id || !subLessonId) continue;

    const assignments = assignmentsByCourse.get(courseId) ?? [];
    assignments.push({ id: row.id, subLessonId });
    assignmentsByCourse.set(courseId, assignments);
    assignmentIds.push(row.id);
  }

  return { assignmentsByCourse, assignmentIds };
}

function mapSubmittedAssignmentSubLessons(assignments, submittedIds) {
  const assignmentIdsBySubLesson = new Map();
  for (const assignment of assignments ?? []) {
    const list = assignmentIdsBySubLesson.get(assignment.subLessonId) ?? [];
    list.push(assignment.id);
    assignmentIdsBySubLesson.set(assignment.subLessonId, list);
  }

  const submittedSubLessonIds = [];
  for (const [subLessonId, assignmentIds] of assignmentIdsBySubLesson) {
    if (assignmentIds.every((id) => submittedIds.has(id))) {
      submittedSubLessonIds.push(subLessonId);
    }
  }

  return submittedSubLessonIds;
}

async function getBatchEnrollmentProgress(supabase, userId, enrolledCourses) {
  const courseIds = enrolledCourses
    .map((enrollment) =>
      Array.isArray(enrollment.courses)
        ? enrollment.courses[0]?.id
        : enrollment.courses?.id,
    )
    .filter(Boolean);

  if (courseIds.length === 0) {
    return new Map();
  }

  const [{ data: progressRows, error: progressError }, { data: assignmentRows, error: assignmentError }] =
    await Promise.all([
      supabase
        .from("sub_lesson_progress")
        .select(
          "course_id, sub_lesson_id, visited_at, completed_at, assignment_submitted_at",
        )
        .eq("user_id", userId)
        .in("course_id", courseIds),
      supabase
        .from("assignments")
        .select("id, course_id, sub_lesson_id")
        .in("course_id", courseIds),
    ]);

  const progressByCourse = progressError
    ? new Map()
    : mapBatchProgressRows(progressRows);
  const { assignmentsByCourse, assignmentIds } = assignmentError
    ? { assignmentsByCourse: new Map(), assignmentIds: [] }
    : mapBatchAssignments(assignmentRows);

  let submittedAssignmentIds = new Set();
  if (assignmentIds.length > 0) {
    const { data: submissionRows, error: submissionError } = await supabase
      .from("submissions")
      .select("assignment_id, status, submitted_at")
      .eq("user_id", userId)
      .in("assignment_id", assignmentIds);

    if (!submissionError) {
      submittedAssignmentIds = new Set(
        (submissionRows ?? [])
          .filter((row) => row?.submitted_at || row?.status === "submitted")
          .map((row) => row?.assignment_id)
          .filter(Boolean),
      );
    }
  }

  const progressByCourseWithSubmissions = new Map();
  for (const courseId of courseIds) {
    const progress = progressByCourse.get(courseId) ?? {
      visitedIds: [],
      completedIds: [],
      submittedAssignmentIds: [],
    };
    const submittedFromSubmissions = mapSubmittedAssignmentSubLessons(
      assignmentsByCourse.get(courseId),
      submittedAssignmentIds,
    );
    const submittedIds = [
      ...new Set([
        ...progress.submittedAssignmentIds,
        ...submittedFromSubmissions,
      ]),
    ];

    progressByCourseWithSubmissions.set(courseId, {
      ...progress,
      assignments: assignmentsByCourse.get(courseId) ?? [],
      visitedIds: [...new Set([...progress.visitedIds, ...submittedIds])],
      submittedAssignmentIds: submittedIds,
    });
  }

  return progressByCourseWithSubmissions;
}

export async function getUserEnrolledCourses(supabase, userId) {
  if (!supabase || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      subscribed_at,
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
        lessons (
          id,
          sub_lessons ( id )
        )
      )
    `)
    .eq("user_id", userId)
    .order("subscribed_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load enrolled courses.");
  }

  const progressByCourse = await getBatchEnrollmentProgress(
    supabase,
    userId,
    data ?? [],
  );

  const courses = (data ?? []).map((enrollment) => {
      const mapped = mapEnrolledCourse(enrollment);
      const course = Array.isArray(enrollment.courses)
        ? enrollment.courses[0]
        : enrollment.courses;
      if (!mapped || !course) return null;

      const progress = progressByCourse.get(course.id) ?? {
        visitedIds: [],
        completedIds: [],
        submittedAssignmentIds: [],
      };
      const assignments = progress.assignments ?? [];
      const lessonsWithStatus = withMockLessonStatuses(
        courseLessonsForProgress(course),
        null,
        progress.completedIds,
        {
          visitedIds: progress.visitedIds,
          assignmentSubLessonIds: assignments.map(
            (assignment) => assignment.subLessonId,
          ),
          submittedAssignmentSubLessonIds: progress.submittedAssignmentIds,
        },
      );

      return {
        ...mapped,
        progress: Math.min(100, Math.max(0, mockProgressPercent(lessonsWithStatus))),
      };
    });

  return courses.filter(Boolean);
}

export async function loadMyCourses() {
  const response = await fetch("/api/enrollments", {
    method: "GET",
    cache: "no-store",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to load your courses.");
  }

  return Array.isArray(data?.courses) ? data.courses : [];
}
