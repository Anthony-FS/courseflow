import Link from "next/link";

export default function CourseNotFound() {
  return (
    <main className="mx-auto w-[calc(100%-3rem)] max-w-280 py-24">
      <h1 className="text-headline2 font-medium text-black">Course not found</h1>
      <p className="mt-4 text-body2 text-gray-700">
        This course code does not match any course.
      </p>
      <Link
        href="/courses"
        className="mt-8 inline-flex text-body2 font-medium text-blue-500 hover:text-blue-400"
      >
        Back to Our Courses
      </Link>
    </main>
  );
}
