import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CourseTrailer } from "@/components/course-detail/course-trailer";
import {
  CoursePurchaseMobileBar,
  CoursePurchaseSidebar,
} from "@/components/course-detail/course-purchase-card";
import { ModuleSamples } from "@/components/course-detail/module-samples";
import { OtherInterestingCourses } from "@/components/course-detail/other-interesting-courses";
import { CourseAttachmentSection } from "@/components/course-detail/subscribed-actions";
import Footer from "@/components/footer";
import { getSessionUser } from "@/lib/auth";
import {
  getCourseAttachment,
  getCourseByCode,
  getOtherInterestingCourses,
} from "@/lib/courses";
import {
  getUserEnrolledCourseIds,
  isCourseEnrolled,
} from "@/lib/enrollments";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  getUserWishlistCourseIds,
  isCourseWishlisted,
} from "@/lib/wishlist";

function catalogClient(sessionSupabase) {
  return createServiceClient() ?? sessionSupabase;
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  const metadataSupabase = createServiceClient() ?? (await createServerClient());

  const course = await getCourseByCode(
    metadataSupabase,
    code,
    catalogClient(metadataSupabase),
  );
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
  const [
    inWishlist,
    isSubscribed,
    attachment,
    otherCourses,
    enrolledCourseIds,
    wishlistCourseIds,
  ] = await Promise.all([
    isCourseWishlisted(supabase, user.id, course.id),
    isCourseEnrolled(catalog, user.id, course.id),
    getCourseAttachment(catalog, course.id),
    getOtherInterestingCourses(catalog, {
      excludeCourseId: course.id,
      userId: user.id,
      limit: 3,
    }),
    getUserEnrolledCourseIds(catalog, user.id),
    getUserWishlistCourseIds(supabase, user.id),
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

        <CoursePurchaseSidebar
          courseCode={course.courseCode}
          courseId={course.id}
          initiallySaved={inWishlist}
          isSubscribed={isSubscribed}
          price={course.price}
          summary={course.summary}
          title={course.title}
        />

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
      <CoursePurchaseMobileBar
        courseCode={course.courseCode}
        courseId={course.id}
        initiallySaved={inWishlist}
        isSubscribed={isSubscribed}
        price={course.price}
        summary={course.summary}
        title={course.title}
      />
      <OtherInterestingCourses
        courses={otherCourses}
        enrolledCourseIds={enrolledCourseIds}
        wishlistCourseIds={wishlistCourseIds}
      />
      <Footer />
    </>
  );
}
