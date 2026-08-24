import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { getCourseByCode } from "@/lib/courses";
import { isCourseEnrolled } from "@/lib/enrollments";
import { createServiceClient } from "@/lib/supabase/server";

export default async function CourseLearnPage({ params }) {
  const { code } = await params;
  const { user, supabase } = await getSessionUser();

  if (!user) {
    redirect(`/login?next=/courses/${encodeURIComponent(code)}/learn`);
  }

  const catalog = createServiceClient() ?? supabase;
  const course = await getCourseByCode(supabase, code, catalog);
  if (!course) {
    notFound();
  }

  const isSubscribed = await isCourseEnrolled(catalog, user.id, course.id);
  if (!isSubscribed) {
    redirect(`/courses/${encodeURIComponent(course.courseCode)}`);
  }

  return (
    <main className="mx-auto w-[calc(100%-3rem)] max-w-280 py-16">
      <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
        {course.title}
      </h1>
      <p className="mt-4 text-body2 text-gray-700">
        Start learning from this course. Lessons will open here.
      </p>
      <Link
        href={`/courses/${encodeURIComponent(course.courseCode)}`}
        className="mt-8 inline-flex text-body2 font-medium text-blue-500 hover:text-blue-400"
      >
        Back to course
      </Link>
    </main>
  );
}
