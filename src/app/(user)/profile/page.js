import { redirect } from "next/navigation";

import Footer from "@/components/footer";
import { ProfileForm } from "@/components/profile/profile-form";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Profile | CourseFlow",
};

export default async function ProfilePage() {
  const { user, profile } = await getSessionUser();
  if (!user) redirect("/login?next=/profile");

  return (
    <div className="profile-page flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="relative min-h-238.75 flex-1 overflow-hidden max-[680px]:min-h-0" aria-label="Profile">
        <span className="pointer-events-none absolute top-39 left-[3%] size-6.5 rounded-full bg-blue-200" aria-hidden="true" />
        <span className="pointer-events-none absolute top-24.5 left-[7%] size-2.75 rounded-full border-4 border-blue-500" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute top-35 right-[9.5%] h-7 w-7.75"
          viewBox="0 0 32 30"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 2L30 4L18 28L2 2Z"
            stroke="var(--orange-100)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <span className="pointer-events-none absolute top-54 -right-0.75 size-18.5 rounded-full bg-blue-200 max-[680px]:-right-9.5" aria-hidden="true" />
        <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-230 py-22 max-[760px]:py-12">
          <h1 className="text-center text-headline2 text-black">Profile</h1>
          <ProfileForm initialProfile={profile} email={user.email} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
