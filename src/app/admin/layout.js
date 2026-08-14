import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "Admin | CourseFlow",
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
