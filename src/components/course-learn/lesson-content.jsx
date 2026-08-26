import { LessonAssignment } from "@/components/course-learn/lesson-assignment";
import { LessonVideo } from "@/components/course-learn/lesson-video";
import { SubLessonRenderer } from "@/components/course-learn/sub-lesson-renderer";
import { hasVideoContentBlock } from "@/lib/sub-lesson-blocks";

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
  const showLegacyVideo = Boolean(videoUrl) && !hasVideoContentBlock(description);

  return (
    <article className="flex min-w-0 flex-1 flex-col px-6 py-8 lg:px-10">
      <div className="w-full">
        <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
          {title}
        </h1>

        {showLegacyVideo ? (
          <div className="mt-6">
            <LessonVideo title={title} coverUrl={coverUrl} videoUrl={videoUrl} />
          </div>
        ) : null}

        {description ? (
          <div className="mt-6 rounded-2xl bg-[#0D1117] p-6 sm:p-8 text-white shadow-card">
            <SubLessonRenderer description={description} />
          </div>
        ) : null}

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
