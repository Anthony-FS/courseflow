import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CourseTrailer } from "@/components/course-detail/course-trailer";
import { ModuleSamples } from "@/components/course-detail/module-samples";
import { OtherInterestingCourses } from "@/components/course-detail/other-interesting-courses";
import { CourseAttachmentSection, StartLearningButton } from "@/components/course-detail/subscribed-actions";
import { SubscribeButton } from "@/components/course-detail/subscribe-button";
import { WishlistButton } from "@/components/course-detail/wishlist-button";
import { getSessionUser } from "@/lib/auth";
import { getCourseAttachment, getCourseByCode } from "@/lib/courses";
import { isCourseEnrolled } from "@/lib/enrollments";
import { formatPrice } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/server";
import { isCourseWishlisted } from "@/lib/wishlist";

function catalogClient(sessionSupabase) {
  return createServiceClient() ?? sessionSupabase;
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  const { user, supabase } = await getSessionUser();

  if (!user) {
    return { title: "Course | CourseFlow" };
  }

  const course = await getCourseByCode(supabase, code, catalogClient(supabase));
  if (!course) {
    return { title: "Course not found | CourseFlow" };
  }

  return { title: `${course.title} | CourseFlow` };
}

export default async function CourseDetailPage({ params }) {
  const { code } = await params;
  const { user, supabase } = await getSessionUser();

  if (!user) {
    redirect(`/login?next=/courses/${encodeURIComponent(code)}`);
  }

  const course = await getCourseByCode(supabase, code, catalogClient(supabase));
  if (!course) {
    notFound();
  }

  const catalog = catalogClient(supabase);
  const [inWishlist, isSubscribed, attachment] = await Promise.all([
    isCourseWishlisted(supabase, user.id, course.id),
    isCourseEnrolled(catalog, user.id, course.id),
    getCourseAttachment(catalog, course.id),
  ]);

  return (
    <>
      <main className="mx-auto w-[calc(100%-3rem)] max-w-280 pb-16 pt-8">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-body2 font-medium text-blue-500 hover:text-blue-400"
      >
        <ArrowLeft className="size-5" aria-hidden />
        Back
      </Link>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-x-10">
        <CourseTrailer
          title={course.title}
          coverUrl={course.coverUrl}
          trailerUrl={course.trailerUrl}
        />

        <aside className="rounded-lg bg-white p-6 shadow-card">
          <p className="text-body3 font-medium text-orange-500">Course</p>
          <h1 className="mt-2 text-headline2 font-medium tracking-[-0.02em] text-black">
            {course.title}
          </h1>
          {course.summary ? (
            <p className="mt-3 text-body2 leading-normal text-gray-700">
              {course.summary}
            </p>
          ) : null}
          <p className="mt-6 text-headline3 font-medium text-gray-900">
            THB {formatPrice(course.price)}
          </p>
          <div className="mt-6 h-px bg-gray-300" />
          <div className="mt-6 grid gap-4">
            {isSubscribed ? (
              <StartLearningButton courseCode={code} />
            ) : (
              <>
                <WishlistButton
                  courseId={course.id}
                  initiallySaved={inWishlist}
                />
                <SubscribeButton
                  courseId={course.id}
                  courseTitle={course.title}
                />
              </>
            )}
          </div>
        </aside>

        <div className="space-y-16 lg:col-start-1">
          <section aria-labelledby="course-detail-heading">
            <h2
              id="course-detail-heading"
              className="text-headline3 font-medium text-black"
            >
              Course Detail
            </h2>
            <div className="mt-6 space-y-4 text-body2 leading-normal text-gray-700">
              {course.description ? (
                <p className="whitespace-pre-wrap">{course.description}</p>
              ) : null}
              {!course.summary && !course.description ? (
                <p>Course details will appear here soon.</p>
              ) : null}
            </div>
          </section>

          {isSubscribed ? (
            <CourseAttachmentSection attachment={attachment} />
          ) : null}

          <ModuleSamples lessons={course.lessons} />
        </div>
      </div>
      </main>
      <OtherInterestingCourses />
    </>
  );
}
