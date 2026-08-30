"use client";

import { useMemo, useState } from "react";

import { LessonAssignment } from "@/components/course-learn/lesson-assignment";
import {
  markAssignmentSubmitted,
  notifyAssignmentSubmitted,
} from "@/lib/course-learn-progress";

function LessonAssignmentList({
  entries = [],
  courseId,
  subLessonId,
  className,
}) {
  const initialSubmittedIds = useMemo(
    () =>
      entries
        .filter(({ submission }) =>
          Boolean(submission?.submittedAt || submission?.status === "submitted"),
        )
        .map(({ assignment }) => assignment.id),
    [entries],
  );
  const [submittedAssignmentIds, setSubmittedAssignmentIds] = useState(
    () => new Set(initialSubmittedIds),
  );

  async function handleSubmitted(assignmentId) {
    const nextSubmitted = new Set(submittedAssignmentIds);
    nextSubmitted.add(assignmentId);
    setSubmittedAssignmentIds(nextSubmitted);

    const allSubmitted = entries.every(({ assignment }) =>
      nextSubmitted.has(assignment.id),
    );
    if (!allSubmitted) {
      return;
    }

    notifyAssignmentSubmitted(courseId, subLessonId);
    try {
      await markAssignmentSubmitted(courseId, subLessonId);
    } catch {
      // Submission rows remain the source of truth on reload.
    }
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {entries.map(({ assignment, submission }, index) => (
        <LessonAssignment
          key={assignment.id}
          className={index === 0 ? undefined : "mt-8"}
          assignment={assignment}
          submission={submission}
          courseId={courseId}
          subLessonId={subLessonId}
          onSubmitted={() => handleSubmitted(assignment.id)}
        />
      ))}
    </div>
  );
}

export { LessonAssignmentList };
