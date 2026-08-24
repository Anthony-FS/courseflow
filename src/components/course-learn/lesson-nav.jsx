import Link from "next/link";

import { Button } from "@/components/ui/button";
import { learnSubLessonHref } from "@/lib/course-learn";
import { cn } from "@/lib/utils";

function LessonNav({ courseCode, previous, next, className }) {
  return (
    <nav
      aria-label="Lesson navigation"
      className={cn(
        "flex w-full items-center justify-between gap-4 border-t border-gray-300 bg-white px-6 py-5 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 justify-start">
        {previous ? (
          <Link
            href={learnSubLessonHref(courseCode, previous.id)}
            className="text-body2 font-medium text-blue-500 transition-colors hover:text-blue-400"
          >
            Previous Lesson
          </Link>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end">
        {next ? (
          <Button asChild size="sm" className="min-h-12 px-6">
            <Link href={learnSubLessonHref(courseCode, next.id)}>
              Next Lesson
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="min-h-12 px-6" disabled>
            Next Lesson
          </Button>
        )}
      </div>
    </nav>
  );
}

export { LessonNav };
