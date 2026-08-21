import Link from "next/link";

import { Button } from "@/components/ui/button";
import { learnSubLessonHref } from "@/lib/course-learn";
import { cn } from "@/lib/utils";

function LessonNav({ courseCode, previous, next, className }) {
  return (
    <nav
      aria-label="Lesson navigation"
      className={cn(
        "flex items-center justify-between gap-4 border-t border-gray-300 bg-white px-6 py-5 sm:px-10",
        className,
      )}
    >
      {previous ? (
        <Link
          href={learnSubLessonHref(courseCode, previous.id)}
          className="text-body2 font-medium text-blue-500 transition-colors hover:text-blue-400"
        >
          Previous Lesson
        </Link>
      ) : (
        <span className="min-w-0" />
      )}

      {next ? (
        <Button asChild size="sm" className="min-h-12 px-6">
          <Link href={learnSubLessonHref(courseCode, next.id)}>Next Lesson</Link>
        </Button>
      ) : (
        <Button size="sm" className="min-h-12 px-6" disabled>
          Next Lesson
        </Button>
      )}
    </nav>
  );
}

export { LessonNav };
