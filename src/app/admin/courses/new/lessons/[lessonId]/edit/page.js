import LessonForm from "@/components/admin/lesson-form";

export const metadata = {
  title: "Edit Lesson | CourseFlow Admin",
  description: "Edit draft lesson details",
};

export default function EditDraftLessonPage() {
  return <LessonForm mode="edit" />;
}
