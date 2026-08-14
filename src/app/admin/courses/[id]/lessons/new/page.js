export default async function AddLessonPlaceholderPage({ params }) {
  const { id } = await params;

  return (
    <main className="p-10">
      <h1 className="text-headline3">Add Lesson</h1>
      <p className="mt-2 text-body2 text-gray-700">
        Placeholder — add lesson form for course {id} is not available yet.
      </p>
    </main>
  );
}
