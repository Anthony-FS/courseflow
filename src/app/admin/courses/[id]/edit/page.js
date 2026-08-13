export default async function EditCoursePage({ params }) {
  const { id } = await params;

  return (
    <main className="p-10">
      <h1 className="text-headline3">Edit course</h1>
      <p className="mt-2 text-body2 text-gray-700">
        Placeholder for course {id}. The edit form is not part of this page yet.
      </p>
    </main>
  );
}
