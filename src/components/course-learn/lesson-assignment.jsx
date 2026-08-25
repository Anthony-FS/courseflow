"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { markAssignmentSubmitted } from "@/lib/course-learn-progress";
import { cn } from "@/lib/utils";

/**
 * Assignment card for the active sub-lesson.
 * Submit is stubbed until learner submissions API exists.
 */
function LessonAssignment({
  question,
  status = "pending",
  deadlineLabel,
  courseId,
  subLessonId,
  className,
}) {
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    markAssignmentSubmitted(courseId, subLessonId);
    setNotice("Assignment submit will be available soon.");
  }

  return (
    <section
      aria-labelledby="lesson-assignment-heading"
      className={cn(
        "rounded-xl bg-blue-100 px-6 py-6 sm:px-8 sm:py-7",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <h2
          id="lesson-assignment-heading"
          className="text-headline3 font-medium text-black"
        >
          Assignment
        </h2>
        <StatusBadge status={status} />
      </header>

      <p className="mt-4 text-body2 text-black">{question}</p>

      <form className="mt-4" onSubmit={handleSubmit}>
        <label htmlFor="lesson-assignment-answer" className="sr-only">
          Your answer
        </label>
        <textarea
          id="lesson-assignment-answer"
          name="answer"
          rows={5}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Answer..."
          className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-body2 text-black outline-none placeholder:text-gray-500 focus-visible:border-blue-500 focus-visible:shadow-focus"
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <Button type="submit" size="sm" className="min-h-12 px-6">
            Send Assignment
          </Button>
          {deadlineLabel ? (
            <p className="text-body3 text-gray-700">{deadlineLabel}</p>
          ) : null}
        </div>

        {notice ? (
          <p className="mt-3 text-body3 text-gray-700" role="status">
            {notice}
          </p>
        ) : null}
      </form>
    </section>
  );
}

export { LessonAssignment };
