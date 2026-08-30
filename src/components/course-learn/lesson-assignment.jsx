"use client";

import { AssignmentSubmissionCard } from "@/components/assignment-submission-card";

/**
 * Learn-page assignment card: real submission UX + progress sidebar sync.
 */
function LessonAssignment({
  assignment,
  submission = null,
  courseId,
  subLessonId,
  className,
  onSubmitted,
}) {
  if (!assignment?.id) {
    return null;
  }

  return (
    <AssignmentSubmissionCard
      className={className}
      assignment={assignment}
      submission={submission}
      onSubmitted={async (result) => {
        await onSubmitted?.(result);
      }}
    />
  );
}

export { LessonAssignment };
