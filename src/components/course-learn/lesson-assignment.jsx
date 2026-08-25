"use client";

import { AssignmentSubmissionCard } from "@/components/assignment-submission-card";
import {
  markAssignmentSubmitted,
  notifyAssignmentSubmitted,
} from "@/lib/course-learn-progress";

/**
 * Learn-page assignment card: real submission UX + progress sidebar sync.
 */
function LessonAssignment({
  assignment,
  submission = null,
  courseId,
  subLessonId,
  className,
}) {
  if (!assignment?.id) {
    return null;
  }

  return (
    <AssignmentSubmissionCard
      className={className}
      assignment={assignment}
      submission={submission}
      onSubmitted={async () => {
        // Update sidebar immediately; persist progress in the background.
        notifyAssignmentSubmitted(courseId, subLessonId);
        try {
          await markAssignmentSubmitted(courseId, subLessonId);
        } catch {
          // Submission is already saved; progress will reconcile on next load
          // via submissions → submittedAssignmentIds.
        }
      }}
    />
  );
}

export { LessonAssignment };
