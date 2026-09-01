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
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await markAssignmentSubmitted(courseId, subLessonId);
      setNotice("Assignment submitted.");
    } catch (error) {
      setNotice(error.message || "Failed to submit assignment.");
    }
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
