import AssignmentForm from "@/components/admin/assignment-form";

export const metadata = {
  title: "Edit Assignment | CourseFlow Admin",
};

export default async function EditAssignmentPage({ params }) {
  const { id } = await params;

  return <AssignmentForm assignmentId={id} />;
}