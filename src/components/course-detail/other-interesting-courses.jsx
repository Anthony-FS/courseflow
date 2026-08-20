function CourseCardPlaceholder() {
  return (
    <article className="overflow-hidden rounded-lg bg-white shadow-card">
      <div className="aspect-16/10 bg-gray-200" aria-hidden />
      <div className="p-6">
        <p className="text-body3 font-medium text-orange-500">Course</p>
        <div className="mt-2 h-7 w-3/4 rounded bg-gray-200" />
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mx-6 h-px bg-gray-300" />
      <div className="flex items-center gap-6 px-6 py-4">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>
    </article>
  );
}

function OtherInterestingCourses() {
  return (
    <section
      className="bg-gray-100 py-16"
      aria-labelledby="other-interesting-courses-heading"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-280">
        <h2
          id="other-interesting-courses-heading"
          className="text-center text-headline2 font-medium tracking-[-0.02em] text-black"
        >
          Other Interesting Courses
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <CourseCardPlaceholder />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { OtherInterestingCourses };
