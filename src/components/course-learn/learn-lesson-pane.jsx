import { LessonContent } from "@/components/course-learn/lesson-content";
import { LessonNav } from "@/components/course-learn/lesson-nav";
import {
  getAssignmentAnswerKeys,
  getUserAssignmentSubmissions,
} from "@/lib/course-learn";
import { hasVideoContentBlock } from "@/lib/sub-lesson-blocks";

async function LearnLessonPane({
  contentPromise,
  catalog,
  supabase,
  userId,
  course,
  active,
  activeAssignments,
}) {
  const [subLessonContent, submissionsByAssignment] = await Promise.all([
    contentPromise,
    getUserAssignmentSubmissions(
      supabase,
      userId,
      activeAssignments.map((assignment) => assignment.id),
    ),
  ]);

  const submittedAssignments = activeAssignments.filter((assignment) =>
    submissionsByAssignment.has(assignment.id),
  );
  const answerKeysByAssignment = await getAssignmentAnswerKeys(
    catalog,
    submittedAssignments,
  );

  const assignmentEntries = activeAssignments.map((assignment) => {
    const submission = submissionsByAssignment.get(assignment.id) ?? null;
    const answerKeys = submission
      ? answerKeysByAssignment.get(assignment.id)
      : null;

    return {
      assignment: answerKeys ? { ...assignment, ...answerKeys } : assignment,
      submission,
    };
  });

  return (
    <LessonContent
      title={subLessonContent?.title ?? active.title}
      description={subLessonContent?.description}
      coverUrl={course.coverUrl}
      videoUrl={subLessonContent?.videoUrl ?? null}
      assignmentEntries={assignmentEntries}
      courseId={course.id}
      subLessonId={active.id}
    />
  );
}

async function LearnLessonNavLoader({
  contentPromise,
  courseId,
  courseCode,
  currentSubLessonId,
  previous,
  next,
  subLessonIds,
  initialCompletedIds,
}) {
  const subLessonContent = await contentPromise;
  const requiresVideo =
    Boolean(subLessonContent?.videoUrl) ||
    hasVideoContentBlock(subLessonContent?.description);

  return (
    <LessonNav
      courseId={courseId}
      courseCode={courseCode}
      currentSubLessonId={currentSubLessonId}
      previous={previous}
      next={next}
      requiresVideo={requiresVideo}
      subLessonIds={subLessonIds}
      initialCompletedIds={initialCompletedIds}
    />
  );
}

export { LearnLessonNavLoader, LearnLessonPane };
