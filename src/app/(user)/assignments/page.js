import { redirect } from "next/navigation";

import {
  MemberAssignmentEmptyState,
  MemberAssignmentErrorState,
} from "@/components/assignments/member-assignment-states";
import { MemberAssignmentTable } from "@/components/assignments/member-assignment-table";
import Footer from "@/components/footer";
import { getSessionUser } from "@/lib/auth";
import { getMemberAssignments } from "@/lib/member-assignments";

export const metadata = {
  title: "My Assignments | CourseFlow",
};

export default async function MyAssignmentsPage() {
  const { supabase, user } = await getSessionUser();

  if (!user) {
    redirect("/login?next=/assignments");
  }

  let result = null;
  try {
    result = await getMemberAssignments(supabase, user.id);
  } catch {
    result = null;
  }

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="flex-1" aria-label="My Assignments">
        <div className="mx-auto w-[calc(100%-3rem)] max-w-280 py-10 sm:py-16">
          <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
            My Assignments
          </h1>

          {!result ? <MemberAssignmentErrorState /> : null}
          {result?.enrollmentCount === 0 ? (
            <MemberAssignmentEmptyState type="no-enrollments" />
          ) : null}
          {result?.enrollmentCount > 0 && result.assignments.length === 0 ? (
            <MemberAssignmentEmptyState type="no-assignments" />
          ) : null}
          {result?.assignments.length > 0 ? (
            <div className="mt-10">
              <MemberAssignmentTable assignments={result.assignments} />
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
