import { LessonAssignment } from "@/components/course-learn/lesson-assignment";
import { LessonVideo } from "@/components/course-learn/lesson-video";
import { MOCK_ASSIGNMENT } from "@/lib/course-learn";

function LessonContent({ title, coverUrl, videoUrl = null, assignment = MOCK_ASSIGNMENT }) {
  return (
    <article className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12">
      <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
        {title}
      </h1>

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
