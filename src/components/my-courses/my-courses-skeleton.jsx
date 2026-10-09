export function MyCoursesSkeleton() {
  return (
    <section
      className="mt-10 grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"
      aria-busy="true"
      aria-live="polite"
      aria-label="Your learning"
    >
      <p className="sr-only">Loading your courses</p>
      <div className="h-72 animate-pulse rounded-2xl bg-gray-200" aria-hidden="true" />
      <div aria-hidden="true">
        <div className="h-12 border-b border-gray-300" />
        <ul className="mt-8 grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <div className="aspect-16/10 animate-pulse rounded-2xl bg-gray-200" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
