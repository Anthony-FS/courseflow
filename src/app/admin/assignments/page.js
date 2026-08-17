"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminAssignmentsPage() {
  return (
    <main className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">Assignment</h1>
        <Button asChild className="min-h-12 gap-2 px-6 py-3">
          <Link href="/admin/assignments/new">
            <Plus aria-hidden="true" className="size-5" />
            Add Assignment
          </Link>
        </Button>
      </header>
      <section className="p-10">
        <p className="text-body2 text-gray-700">
          Assignment management is not available yet.
        </p>
      </section>
    </main>
  );
}
