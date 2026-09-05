import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { CourseCurriculumSidebar } from "@/components/course-learn/course-curriculum-sidebar";
import {
  LearnLessonNavLoader,
  LearnLessonPane,
} from "@/components/course-learn/learn-lesson-pane";
import {
  LearnLessonContentPending,
  LearnNavigationProvider,
} from "@/components/course-learn/learn-navigation";
import {
  LessonContentSkeleton,
  LessonNavSkeleton,
} from "@/components/course-learn/lesson-content-skeleton";
import { LockLearnPageScroll } from "@/components/course-learn/lock-learn-page-scroll";
import { ScrollToLessonContentOnNavigate } from "@/components/course-learn/scroll-to-lesson-content";
import { getSessionUser } from "@/lib/auth";
import {
  flattenSubLessons,
  getAssignmentsForCourse,
  getSubLessonLearningContent,
  resolveActiveSubLesson,
} from "@/lib/course-learn";
import { getCourseProgress } from "@/lib/course-learn-progress";
import { LEARN_CONTENT_PANE_ID } from "@/lib/course-learn-scroll";
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
  const progressPromise = getCourseProgress(supabase, user.id, course.id, {
    assignmentsPromise,
  });
  const contentPromise = getSubLessonLearningContent(catalog, {
    courseId: course.id,
    subLessonId: active.id,
  });
  const [courseAssignments, progress] = await Promise.all([
    assignmentsPromise,
    progressPromise,
  ]);
  const assignmentSubLessonIds = courseAssignments.map(
    (assignment) => assignment.subLessonId,
  );
  const activeAssignments = courseAssignments.filter(
    (assignment) => assignment.subLessonId === active.id,
  );
  const subLessonIds = flatSubLessons.map((subLesson) => subLesson.id);

  return (
    <LearnNavigationProvider activeSubLessonId={active.id}>
      <main className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <LockLearnPageScroll />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-none lg:flex-row lg:overflow-hidden">
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

          <div
            id={LEARN_CONTENT_PANE_ID}
            className="flex min-h-0 min-w-0 flex-1 justify-center lg:overflow-y-auto lg:overscroll-y-none"
          >
            <LearnLessonContentPending>
              <Suspense
                key={active.id}
                fallback={<LessonContentSkeleton />}
              >
                <LearnLessonPane
                  contentPromise={contentPromise}
                  catalog={catalog}
                  supabase={supabase}
                  userId={user.id}
                  course={course}
                  active={active}
                  activeAssignments={activeAssignments}
                />
              </Suspense>
            </LearnLessonContentPending>
          </div>

          <ScrollToLessonContentOnNavigate subLessonId={active.id} />
        </div>

        <div className="w-full shrink-0 bg-white">
          <Suspense key={`nav-${active.id}`} fallback={<LessonNavSkeleton />}>
            <LearnLessonNavLoader
              contentPromise={contentPromise}
              courseId={course.id}
              courseCode={courseCode}
              currentSubLessonId={active.id}
              previous={prev}
              next={next}
              subLessonIds={subLessonIds}
              initialCompletedIds={progress.completedIds}
            />
          </Suspense>
        </div>
      </main>
    </LearnNavigationProvider>
  );
}
