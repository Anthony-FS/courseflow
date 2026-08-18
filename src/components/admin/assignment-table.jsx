export function AssignmentTable({
  assignments = [],
  isLoading = false,
}) {
  const emptyMessage = isLoading
    ? "Loading assignments..."
    : "No assignments found.";

  return (
    <section className="overflow-x-auto bg-white">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead className="bg-gray-100 text-body3 text-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              Assignment detail
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Course
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Lesson
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Sub-lesson
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Created date
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="text-body2 text-gray-800">
          {assignments.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-10 text-center text-gray-600"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            assignments.map((assignment) => (
              <tr
                key={assignment.id}
                className="border-t border-gray-300"
              >
                <td className="px-6 py-4">{assignment.title}</td>
                <td className="px-6 py-4">{assignment.courseTitle}</td>
                <td className="px-6 py-4">{assignment.lessonTitle}</td>
                <td className="px-6 py-4">{assignment.subLessonTitle}</td>
                <td className="px-6 py-4">{assignment.dateLabel}</td>
                <td className="px-6 py-4">-</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}