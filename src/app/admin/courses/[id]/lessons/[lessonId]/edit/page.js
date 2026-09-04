import LessonForm from "@/components/admin/lesson-form";

export const metadata = {
  title: "Edit Lesson | CourseFlow Admin",
  description: "Edit lesson details",
};

export default function EditLessonPage() {
  return <LessonForm mode="edit" />;
}
