import { AddCourseForm } from "@/components/add-course-form";

export const metadata = {
  title: "Edit Course | Admin | CourseFlow",
};

export default async function EditCoursePage({ params }) {
  const { id } = await params;

  return <AddCourseForm mode="edit" courseId={id} />;
}
