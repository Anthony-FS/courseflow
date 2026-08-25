import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

function LessonStatusIcon({ status = "not-started", className }) {
  if (status === "completed") {
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

  if (status === "in-progress") {
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

  if (status === "pending-assignment") {
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
