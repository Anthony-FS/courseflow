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

export { CourseCardSkeleton };
