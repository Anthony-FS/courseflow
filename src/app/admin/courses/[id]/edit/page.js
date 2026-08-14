import { CourseLessonsSection } from "@/components/course-lessons-section";

export default async function EditCoursePage({ params }) {
  const { id } = await params;

  return (
    <main className="flex min-h-full flex-col">
      <header className="border-b border-gray-300 bg-white px-10 py-5">
        <h1 className="text-headline3 text-gray-900">Edit course</h1>
        <p className="mt-2 text-body2 text-gray-700">
          Course details form coming soon. Lessons below load from the database.
        </p>
      </header>

      <div className="px-10 py-10">
        <CourseLessonsSection courseId={id} />
      </div>
    </main>
  );
}
