import { AddCourseDraftProvider } from "@/components/admin/add-course-draft-content";

export default function AddCourseLayout({ children }) {
  return <AddCourseDraftProvider>{children}</AddCourseDraftProvider>;
}
