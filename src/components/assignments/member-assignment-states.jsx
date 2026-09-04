import Link from "next/link";
import { BookOpen, ClipboardCheck, TriangleAlert } from "lucide-react";

export function MemberAssignmentEmptyState({ type }) {
  const noEnrollments = type === "no-enrollments";

  return (
    <div className="mx-auto mt-12 flex max-w-lg flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card sm:p-12">
      <div className="grid size-16 place-items-center rounded-full bg-blue-100 text-blue-500">
        {noEnrollments ? (
          <BookOpen className="size-8" aria-hidden />
        ) : (
          <ClipboardCheck className="size-8" aria-hidden />
        )}
      </div>
      <h2 className="mt-4 text-headline3 font-medium text-black">
        {noEnrollments
          ? "You haven’t enrolled in any courses yet."
          : "You don’t have any assignments yet."}
      </h2>
      <p className="mt-2 text-body2 text-gray-700">
        {noEnrollments
          ? "Browse our catalog and choose a course to start learning."
          : "Assignments from your enrolled courses will appear here."}
      </p>
      {noEnrollments ? (
        <Link
          href="/courses"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-blue-500 px-6 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
        >
          Explore Courses
        </Link>
      ) : null}
    </div>
  );
}

export function MemberAssignmentErrorState() {
  return (
    <div
      className="mx-auto mt-12 flex max-w-lg flex-col items-center rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center"
      role="alert"
    >
      <TriangleAlert className="size-10 text-orange-500" aria-hidden />
      <h2 className="mt-4 text-headline3 font-medium text-black">
        We couldn’t load your assignments.
      </h2>
      <p className="mt-2 text-body2 text-gray-700">
        Please refresh the page and try again.
      </p>
    </div>
  );
}
