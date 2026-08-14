"use client";

import { usePathname } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminShell({ children }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return children;
  }

  return (
    <div className="flex min-h-full">
      <AdminSidebar />
      <div className="flex min-h-full min-w-0 flex-1 flex-col bg-gray-100">
        {children}
      </div>
    </div>
  );
}
