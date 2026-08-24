import { LessonAssignment } from "@/components/course-learn/lesson-assignment";
import { LessonVideo } from "@/components/course-learn/lesson-video";
import { MOCK_ASSIGNMENT } from "@/lib/course-learn";

function LessonContent({
  title,
  description = "",
  coverUrl,
  videoUrl = null,
  assignment = MOCK_ASSIGNMENT,
}) {
  return (
    <article className="flex min-w-0 flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12">
      <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
        {title}
      </h1>

      {description ? (
        <p className="mt-3 text-body2 text-gray-700">{description}</p>
      ) : null}

      <div className="mt-6">
        <LessonVideo title={title} coverUrl={coverUrl} videoUrl={videoUrl} />
      </div>

      {assignment ? (
        <LessonAssignment
          className="mt-8"
          question={assignment.question}
          status={assignment.status}
          deadlineLabel={assignment.deadlineLabel}
        />
      ) : null}
    </article>
  );
}

export { LessonContent };
