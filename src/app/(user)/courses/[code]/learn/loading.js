import {
  LessonContentSkeleton,
  LessonNavSkeleton,
} from "@/components/course-learn/lesson-content-skeleton";

export default function CourseLearnLoading() {
  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-white" aria-busy="true">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-none lg:flex-row lg:overflow-hidden">
        <aside
          className="flex w-full min-w-0 shrink-0 flex-col bg-white px-6 py-8 lg:h-full lg:w-[22.5rem] lg:border-r lg:border-gray-300 lg:px-8"
          aria-hidden="true"
        >
          <div className="h-4 w-16 animate-pulse rounded-md bg-gray-200" />
          <div className="mt-2 h-8 w-3/4 animate-pulse rounded-md bg-gray-200" />
          <div className="mt-6 h-4 w-full animate-pulse rounded-md bg-gray-200" />
          <div className="mt-6 h-2.5 w-full animate-pulse rounded-full bg-gray-200" />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 justify-center lg:overflow-y-auto lg:overscroll-y-none">
          <LessonContentSkeleton />
        </div>
      </div>
      <div className="w-full shrink-0 bg-white">
        <LessonNavSkeleton />
      </div>
    </main>
  );
}
