import Link from "next/link";
import Image from "next/image";

import { getSessionUser } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";

export default async function Navbar() {
  const { user, profile } = await getSessionUser();

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email || "User";

  return (
    <header className="relative z-10 h-22 bg-white shadow-card">
      <div className="mx-auto flex h-full w-[calc(100%-3rem)] max-w-280 items-center justify-between">
        <Link
          className="text-headline3 font-medium tracking-[-0.02em] text-blue-500"
          href="/"
          aria-label="CourseFlow home"
        >
          <Image
            src="/courseflow-logo.svg"
            alt="CourseFlow Logo"
            width={120}
            height={40}
          />
        </Link>
        <nav
          className="flex items-center gap-16 max-[760px]:gap-4"
          aria-label="Main navigation"
        >
          <Link
            className="font-medium text-body2 text-blue-700 max-[760px]:hidden"
            href="/courses"
          >
            Our Courses
          </Link>
          {user ? (
            <UserMenu
              displayName={displayName}
              email={user.email}
              avatarUrl={profile?.avatar_url || user.user_metadata?.avatar_url}
            />
          ) : (
            <div className="flex items-center gap-4">
              <Link
                className="inline-flex h-15 min-w-28 items-center justify-center rounded-lg bg-blue-500 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="inline-flex h-15 min-w-28 items-center justify-center rounded-lg bg-blue-200 font-medium text-blue-500 shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
                href="/register"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
