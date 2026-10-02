import { Check } from "lucide-react";

import { SUB_LESSON_STATUS } from "@/lib/sub-lesson-status";
import { cn } from "@/lib/utils";

function LessonStatusIcon({ status = SUB_LESSON_STATUS.NOT_STARTED, className }) {
  // Progress could not be loaded — stay neutral rather than claiming the
  // learner has not started this sub-lesson.
  if (status === SUB_LESSON_STATUS.UNKNOWN) {
    return (
      <span
        className={cn(
          "size-5 shrink-0 rounded-full border-2 border-gray-400 bg-transparent",
          className,
        )}
        aria-label="Progress unavailable"
      />
    );
  }

  if (status === SUB_LESSON_STATUS.COMPLETED) {
    return (
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full bg-green text-white",
          className,
        )}
        aria-hidden
      >
        <Check className="size-3 stroke-[3]" />
      </span>
    );
  }

  if (status === SUB_LESSON_STATUS.IN_PROGRESS) {
    return (
      <span
        className={cn(
          "relative size-5 shrink-0 overflow-hidden rounded-full border-2 border-green",
          className,
        )}
        aria-hidden
      >
        <span className="absolute inset-y-0 left-0 w-1/2 bg-green" />
      </span>
    );
  }

  if (status === SUB_LESSON_STATUS.PENDING_ASSIGNMENT) {
    return (
      <span
        className={cn(
          "relative size-5 shrink-0 overflow-hidden rounded-full border-2 border-orange-100",
          className,
        )}
        aria-label="Assignment pending"
      >
        <span className="absolute inset-y-0 left-0 w-1/2 bg-orange-100" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "size-5 shrink-0 rounded-full border-2 border-green bg-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

export { LessonStatusIcon };
