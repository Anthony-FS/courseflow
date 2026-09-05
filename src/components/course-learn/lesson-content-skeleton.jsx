import { LEARN_LESSON_CONTENT_ID } from "@/lib/course-learn-scroll";
import { cn } from "@/lib/utils";

function SkeletonBar({ className }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

function LessonContentSkeleton() {
  return (
    <section
      id={LEARN_LESSON_CONTENT_ID}
      className="flex min-w-0 flex-1 scroll-mt-22 flex-col px-6 py-8 lg:px-10"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading lesson content"
    >
      <p className="sr-only">Loading lesson content</p>
      <header>
        <SkeletonBar className="h-10 w-3/4 max-w-md" />
      </header>
      <div className="mt-6 aspect-video w-full animate-pulse rounded-lg bg-gray-200" aria-hidden="true" />
      <div className="mt-6 grid gap-3">
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-5/6" />
        <SkeletonBar className="h-4 w-2/3" />
      </div>
    </section>
  );
}

function LessonNavSkeleton() {
  return (
    <div
      className="flex w-full items-center justify-between gap-4 border-t border-gray-300 bg-white px-6 py-5 lg:px-8"
      aria-hidden="true"
    >
      <SkeletonBar className="h-5 w-32" />
      <SkeletonBar className="h-12 w-36 rounded-lg" />
    </div>
  );
}

export { LessonContentSkeleton, LessonNavSkeleton };
