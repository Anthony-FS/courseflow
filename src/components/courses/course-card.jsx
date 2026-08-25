import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";

function CourseCard({ course }) {
  const href = `/courses/${encodeURIComponent(course.courseCode)}`;

  return (
    <article className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card">
      <Link href={href} className="block">
        <div className="relative aspect-16/10 bg-gray-200">
          <Image
            src={course.coverUrl}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
        <div className="p-6">
          <p className="text-body3 font-medium text-orange-500">Course</p>
          <h3 className="mt-2 text-headline3 font-medium text-black">
            {course.title}
          </h3>
          <p className="mt-3 line-clamp-2 text-body3 leading-normal text-gray-700">
            {course.summary}
          </p>
        </div>
        <div className="mx-6 h-px bg-gray-300" />
        <div className="flex items-center gap-6 px-6 py-4 text-body3 text-gray-700">
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-5 text-blue-500" aria-hidden />
            {course.lessonCount} Lesson
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="size-5 text-blue-500" aria-hidden />
            {course.hours} Hours
          </span>
        </div>
      </Link>
    </article>
  );
}

function CourseCardSkeleton() {
  return (
    <article
      className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card"
      aria-hidden
    >
      <div className="aspect-16/10 bg-gray-200" />
      <div className="p-6">
        <div className="h-4 w-16 rounded bg-gray-200" />
        <div className="mt-3 h-7 w-3/4 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-full rounded bg-gray-200" />
      </div>
    </article>
  );
}

export { CourseCard, CourseCardSkeleton };
