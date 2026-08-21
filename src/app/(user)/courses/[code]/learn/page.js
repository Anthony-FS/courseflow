import { notFound, redirect } from "next/navigation";

import { CourseCurriculumSidebar } from "@/components/course-learn/course-curriculum-sidebar";
import { LessonContent } from "@/components/course-learn/lesson-content";
import { LessonNav } from "@/components/course-learn/lesson-nav";
import { getSessionUser } from "@/lib/auth";
import {
  flattenSubLessons,
  MOCK_ASSIGNMENT,
  mockProgressPercent,
  resolveActiveSubLesson,
  withMockLessonStatuses,
} from "@/lib/course-learn";
import { getCourseByCode } from "@/lib/courses";
import { isCourseEnrolled } from "@/lib/enrollments";
import { createServiceClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { code } = await params;
  const { user, supabase } = await getSessionUser();

  if (!user) {
    return { title: "Learn | CourseFlow" };
  }

  const catalog = createServiceClient() ?? supabase;
  const course = await getCourseByCode(supabase, code, catalog);
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
  const lessonsWithStatus = withMockLessonStatuses(
    course.lessons,
    active?.id,
  );
  const progressPercent = mockProgressPercent(lessonsWithStatus);

  if (!active) {
    return (
      <main className="mx-auto w-[calc(100%-3rem)] max-w-280 py-16">
        <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
          {course.title}
        </h1>
        <p className="mt-4 text-body2 text-gray-700">
          This course does not have any sub-lessons yet.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-white">
      <div className="flex flex-1 flex-col lg:flex-row">
        <CourseCurriculumSidebar
          key={active.lessonId}
          courseCode={courseCode}
          courseTitle={course.title}
          courseSummary={course.summary || course.description}
          progressPercent={progressPercent}
          lessons={lessonsWithStatus}
          activeSubLessonId={active.id}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <LessonContent
            title={active.title}
            coverUrl={course.coverUrl}
            videoUrl={null}
            assignment={MOCK_ASSIGNMENT}
          />
          <LessonNav courseCode={courseCode} previous={prev} next={next} />
        </div>
      </div>
    </main>
  );
}
