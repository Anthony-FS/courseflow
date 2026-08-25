import { LessonAssignment } from "@/components/course-learn/lesson-assignment";
import { LessonVideo } from "@/components/course-learn/lesson-video";

function LessonContent({
  title,
  description = "",
  coverUrl,
  videoUrl = null,
  assignment = null,
  submission = null,
  courseId,
  subLessonId,
}) {
  return (
    <article className="flex min-w-0 flex-1 flex-col px-6 py-8 lg:px-10">
      <div className="w-full">
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
            key={assignment.id}
            className="mt-8"
            assignment={assignment}
            submission={submission}
            courseId={courseId}
            subLessonId={subLessonId}
          />
        ) : null}
      </div>
    </article>
  );
}

export { LessonContent };
