"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, FileText, LogOut, TicketPercent } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/admin/courses",
    label: "Course",
    icon: BookOpen,
    match: "/admin/courses",
  },
  {
    href: "/admin/assignments",
    label: "Assignment",
    icon: FileText,
    match: "/admin/assignments",
  },
  {
    href: "/admin/promo-codes",
    label: "Promo code",
    icon: TicketPercent,
    match: "/admin/promo-codes",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-gray-300 bg-white">
      <header className="px-6 pt-10 pb-8">
        <Link href="/admin/courses" aria-label="CourseFlow admin home">
          <Image
            src="/courseflow-logo.svg"
            alt="CourseFlow"
            width={140}
            height={16}
          />
        </Link>
        <p className="mt-2 text-body3 text-gray-600">Admin Panel Control</p>
      </header>

      <nav aria-label="Admin" className="flex flex-1 flex-col px-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.match);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-body2 text-gray-700 transition-colors",
                    isActive
                      ? "bg-blue-100 font-medium text-blue-500"
                      : "hover:bg-gray-100",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <footer className="p-3 pb-6">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-body2 text-gray-700 transition-colors hover:bg-gray-100"
        >
          <LogOut aria-hidden="true" className="size-5" />
          Log out
        </button>
      </footer>
    </aside>
  );
}
