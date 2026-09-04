import { learnSubLessonHref } from "@/lib/course-learn";

const MEMBER_ASSIGNMENT_COLUMNS = `
  id,
  course_id,
  sub_lesson_id,
  title,
  course:courses (
    id,
    title,
    course_code
  ),
  subLesson:sub_lessons (
    id,
    title,
    lesson:lessons (
      id,
      title
    )
  )
`;

function relatedRow(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function mapMemberAssignments(rows, submissions, enrolledCourseIds) {
  const enrolled = new Set(enrolledCourseIds ?? []);
  const submissionByAssignment = new Map(
    (submissions ?? [])
      .filter((submission) => submission?.assignment_id)
      .map((submission) => [submission.assignment_id, submission]),
  );

  return (rows ?? [])
    .filter((row) => row?.id && enrolled.has(row.course_id))
    .map((row) => {
      const course = relatedRow(row.course);
      const subLesson = relatedRow(row.subLesson);
      const lesson = relatedRow(subLesson?.lesson);
      const submission = submissionByAssignment.get(row.id);
      const courseCode = course?.course_code || course?.id || row.course_id;
      const subLessonId = subLesson?.id || row.sub_lesson_id;
      const submitted = Boolean(
        submission?.submitted_at || submission?.status === "submitted",
      );

      return {
        id: row.id,
        title: row.title ?? "",
        courseId: course?.id || row.course_id,
        courseTitle: course?.title ?? "-",
        lessonTitle: lesson?.title ?? "-",
        subLessonTitle: subLesson?.title ?? "-",
        status: submitted ? "submitted" : "pending",
        href: learnSubLessonHref(courseCode, subLessonId),
      };
    });
}

export async function getMemberAssignments(supabase, userId) {
  const user = String(userId ?? "").trim();
  if (!supabase || !user) {
    throw new Error("A signed-in member is required to load assignments.");
  }

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user);

  if (enrollmentError) {
    throw new Error(
      enrollmentError.message || "Failed to load enrolled courses.",
    );
  }

  const enrolledCourseIds = [
    ...new Set(
      (enrollmentRows ?? []).map((row) => row?.course_id).filter(Boolean),
    ),
  ];

  if (enrolledCourseIds.length === 0) {
    return { enrollmentCount: 0, assignments: [] };
  }

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("assignments")
    .select(MEMBER_ASSIGNMENT_COLUMNS)
    .in("course_id", enrolledCourseIds)
    .order("title", { ascending: true });

  if (assignmentError) {
    throw new Error(assignmentError.message || "Failed to load assignments.");
  }

  const authorizedRows = (assignmentRows ?? []).filter((row) =>
    enrolledCourseIds.includes(row?.course_id),
  );
  const assignmentIds = authorizedRows.map((row) => row.id).filter(Boolean);

  let submissionRows = [];
  if (assignmentIds.length > 0) {
    const { data, error: submissionError } = await supabase
      .from("submissions")
      .select("assignment_id, status, submitted_at")
      .eq("user_id", user)
      .in("assignment_id", assignmentIds);

    if (submissionError) {
      throw new Error(
        submissionError.message || "Failed to load assignment submissions.",
      );
    }

    submissionRows = data ?? [];
  }

  return {
    enrollmentCount: enrolledCourseIds.length,
    assignments: mapMemberAssignments(
      authorizedRows,
      submissionRows,
      enrolledCourseIds,
    ),
  };
}

export { MEMBER_ASSIGNMENT_COLUMNS };
