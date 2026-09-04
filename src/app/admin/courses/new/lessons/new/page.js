import LessonForm from "@/components/admin/lesson-form";

export const metadata = {
  title: "Add Lesson | CourseFlow Admin",
  description: "Add lesson to course",
};

export default function AddLessonNewCoursePage() {
  return <LessonForm mode="add" />;
}
