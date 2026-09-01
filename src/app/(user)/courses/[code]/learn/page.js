import { notFound, redirect } from "next/navigation";

import { CourseCurriculumSidebar } from "@/components/course-learn/course-curriculum-sidebar";
import { LessonContent } from "@/components/course-learn/lesson-content";
import { LessonNav } from "@/components/course-learn/lesson-nav";
import { ScrollToLessonContentOnNavigate } from "@/components/course-learn/scroll-to-lesson-content";
import { getSessionUser } from "@/lib/auth";
import {
  flattenSubLessons,
  getAssignmentAnswerKeys,
  getAssignmentsForCourse,
  getSubLessonLearningContent,
  getUserAssignmentSubmissions,
  resolveActiveSubLesson,
} from "@/lib/course-learn";
import { getCourseProgress } from "@/lib/course-learn-progress";
import { getCourseByCode } from "@/lib/courses";
import { isCourseEnrolled } from "@/lib/enrollments";
import {
  createClient as createServerClient,
  createServiceClient,
} from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { code } = await params;
  const metadataSupabase = createServiceClient() ?? (await createServerClient());
  const course = await getCourseByCode(metadataSupabase, code, metadataSupabase);
  if (!course) {
    return { title: "Course not found | CourseFlow" };
  }

  return { title: `Learn · ${course.title} | CourseFlow` };
}

export default async function CourseLearnPage({ params, searchParams }) {
  const { code } = await params;
  const query = await searchParams;
  const { user, supabase } = await getSessionUser();

  if (!user) {
    redirect(`/login?next=/courses/${encodeURIComponent(code)}/learn`);
  }

  const catalog = createServiceClient() ?? supabase;
  const course = await getCourseByCode(supabase, code, catalog);
  if (!course) {
    notFound();
  }

  const courseCode = course.courseCode || code;

  const isSubscribed = await isCourseEnrolled(catalog, user.id, course.id);
  if (!isSubscribed) {
    redirect(`/courses/${encodeURIComponent(courseCode)}`);
  }

  const flatSubLessons = flattenSubLessons(course.lessons);
  const { active, prev, next } = resolveActiveSubLesson(
    flatSubLessons,
    query?.subLessonId,
  );
  if (!active) {
    return (
      <main className="mx-auto w-[calc(100%)] max-w-280 py-16">
        <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
          {course.title}
        </h1>
        <p className="mt-4 text-body2 text-gray-700">
          This course does not have any sub-lessons yet.
        </p>
      </main>
    );
  }

  const assignmentsPromise = getAssignmentsForCourse(catalog, course.id);
  const progressPromise = getCourseProgress(
    supabase,
    user.id,
    course.id,
    { assignmentsPromise },
  );
  const [subLessonContent, courseAssignments, progress] = await Promise.all([
    getSubLessonLearningContent(catalog, {
      courseId: course.id,
      subLessonId: active.id,
    }),
    assignmentsPromise,
    progressPromise,
  ]);
  const assignmentSubLessonIds = courseAssignments.map(
    (assignment) => assignment.subLessonId,
  );
  const activeAssignments = courseAssignments.filter(
    (assignment) => assignment.subLessonId === active.id,
  );
  const {
    submissions: submissionsByAssignment,
    answerKeys: answerKeysByAssignment,
  } = await getUserAssignmentSubmissions(
    supabase,
    user.id,
    activeAssignments.map((assignment) => assignment.id),
  ).then((submissions) =>
    getAssignmentAnswerKeys(
      catalog,
      activeAssignments.filter((assignment) => submissions.has(assignment.id)),
    ).then((answerKeys) => ({ submissions, answerKeys })),
  );
  const assignmentEntries = activeAssignments.map((assignment) => {
    const submission = submissionsByAssignment.get(assignment.id) ?? null;
    const answerKeys = submission
      ? answerKeysByAssignment.get(assignment.id)
      : null;

    return {
      assignment: answerKeys
        ? { ...assignment, ...answerKeys }
        : assignment,
      submission,
    };
  });

  return (
    <main className="flex min-h-[calc(100vh-5.5rem)] flex-1 flex-col bg-white">
      <div className="flex w-full flex-1 flex-col lg:flex-row">
        <CourseCurriculumSidebar
          key={active.lessonId}
          courseId={course.id}
          courseCode={courseCode}
          courseTitle={course.title}
          courseSummary={course.summary || course.description}
          lessons={course.lessons}
          activeSubLessonId={active.id}
          assignmentSubLessonIds={assignmentSubLessonIds}
          initialVisitedIds={progress.visitedIds}
          initialCompletedIds={progress.completedIds}
          initialSubmittedAssignmentIds={progress.submittedAssignmentIds}
        />

        <div className="flex min-w-0 flex-1 justify-center">
          <div className="w-full max-w-3xl flex-1 xl:max-w-4xl">
            <LessonContent
              title={subLessonContent?.title ?? active.title}
              description={subLessonContent?.description}
              coverUrl={course.coverUrl}
              videoUrl={subLessonContent?.videoUrl ?? null}
              assignmentEntries={assignmentEntries}
              courseId={course.id}
              subLessonId={active.id}
            />
          </div>
        </div>

        <ScrollToLessonContentOnNavigate subLessonId={active.id} />
      </div>

      <div className="sticky bottom-0 z-10 w-full shrink-0 bg-white">
        <LessonNav
          courseId={course.id}
          courseCode={courseCode}
          currentSubLessonId={active.id}
          previous={prev}
          next={next}
        />
      </div>
    </main>
  );
}
