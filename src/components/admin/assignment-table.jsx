import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

export function AssignmentTable({
  assignments = [],
  isLoading = false,
  onDelete,
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
                <td className="px-6 py-4">
                  {assignment.courseTitle}
                </td>
                <td className="px-6 py-4">
                  {assignment.lessonTitle}
                </td>
                <td className="px-6 py-4">
                  {assignment.subLessonTitle}
                </td>
                <td className="px-6 py-4">
                  {assignment.dateLabel}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/assignments/${assignment.id}/edit`}
                      aria-label={`Edit ${assignment.title}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-100"
                    >
                      <Pencil
                        aria-hidden="true"
                        className="size-5"
                      />
                    </Link>

                    <button
                      type="button"
                      onClick={() => onDelete(assignment)}
                      aria-label={`Delete ${assignment.title}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-orange-500 hover:bg-orange-100"
                    >
                      <Trash2
                        aria-hidden="true"
                        className="size-5"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}