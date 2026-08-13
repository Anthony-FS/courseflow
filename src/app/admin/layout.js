import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Admin | CourseFlow",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-full">
      <AdminSidebar />
      <div className="flex min-h-full min-w-0 flex-1 flex-col bg-gray-100">
        {children}
      </div>
    </div>
  );
}
