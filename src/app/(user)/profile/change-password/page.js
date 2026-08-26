import { redirect } from "next/navigation";

import Footer from "@/components/footer";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Change Password | CourseFlow",
};

export default async function ChangePasswordPage() {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?next=/profile/change-password");

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="relative flex-1 overflow-hidden" aria-label="Change Password">
        <span className="pointer-events-none absolute top-39 left-[3%] size-6.5 rounded-full bg-blue-200" aria-hidden="true" />
        <span className="pointer-events-none absolute top-24.5 left-[7%] size-2.75 rounded-full border-4 border-blue-500" aria-hidden="true" />
        <span className="pointer-events-none absolute top-54 -right-0.75 size-18.5 rounded-full bg-blue-200 max-[680px]:-right-9.5" aria-hidden="true" />

        <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-230 py-22 max-[760px]:py-12">
          <h1 className="mb-12 text-center text-headline2 text-black">Change Password</h1>
          <ChangePasswordForm email={user.email} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
