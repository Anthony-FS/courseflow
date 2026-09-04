import { LessonAssignmentList } from "@/components/course-learn/lesson-assignment-list";
import { LessonReadSentinel } from "@/components/course-learn/lesson-read-sentinel";
import { LessonVideo } from "@/components/course-learn/lesson-video";
import { SubLessonRenderer } from "@/components/course-learn/sub-lesson-renderer";
import { LEARN_LESSON_CONTENT_ID } from "@/lib/course-learn-scroll";
import { hasVideoContentBlock } from "@/lib/sub-lesson-blocks";

function LessonContent({
  title,
  description = "",
  coverUrl,
  videoUrl = null,
  assignmentEntries = [],
  courseId,
  subLessonId,
}) {
  const showLegacyVideo =
    Boolean(videoUrl) && !hasVideoContentBlock(description);

  return (
    <article
      id={LEARN_LESSON_CONTENT_ID}
      className="flex min-w-0 flex-1 scroll-mt-22 flex-col px-6 py-8 lg:px-10"
    >
      <div className="w-full">
        <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
          {title}
        </h1>

        {showLegacyVideo ? (
          <div className="mt-6">
            <LessonVideo
              title={title}
              coverUrl={coverUrl}
              videoUrl={videoUrl}
              courseId={courseId}
              subLessonId={subLessonId}
            />
          </div>
        ) : null}

        {description ? (
          <div className="mt-6 text-gray-700">
            <SubLessonRenderer
              description={description}
              courseId={courseId}
              subLessonId={subLessonId}
            />
          </div>
        ) : null}

        {assignmentEntries.length > 0 ? (
          <LessonAssignmentList
            className="mt-8"
            entries={assignmentEntries}
            courseId={courseId}
            subLessonId={subLessonId}
          />
        ) : null}

        <LessonReadSentinel courseId={courseId} subLessonId={subLessonId} />
      </div>
    </article>
  );
}

export { LessonContent };
