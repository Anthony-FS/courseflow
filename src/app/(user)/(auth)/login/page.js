import { Plus } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/safe-next-path";

export const metadata = {
  title: "Log in | CourseFlow",
};

function LoginDecorations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        className="absolute top-[421px] left-[-20px] h-[418px] w-[113px]"
        viewBox="0 0 113 418"
        fill="#FBAA1C"
        aria-hidden
      >
        <circle cx="-137" cy="209" r="250" />
      </svg>
      <svg
        className="absolute top-0 right-0 h-[617px] w-[172.64px] text-blue-500"
        viewBox="0 0 173 617"
        fill="currentColor"
        aria-hidden
      >
        <path d="M173 0C95 35 8 95 6 200C4 310 70 490 173 617V0Z" />
      </svg>
      <div className="absolute top-28 left-10 size-[92px] rounded-full bg-blue-200 md:top-36 md:left-16 md:size-[130px]" />
      <Plus
        className="absolute top-52 left-36 size-7 text-green md:top-64 md:left-52 md:size-10"
        strokeWidth={2.75}
      />
      <svg
        className="absolute top-[589px] right-[59px] z-[1] size-[35px]"
        viewBox="0 0 35 35"
        aria-hidden
      >
        <circle cx="17.5" cy="17.5" r="17.5" fill="#FFFFFF" />
        <circle
          cx="17.5"
          cy="17.5"
          r="16"
          fill="none"
          stroke="#F47E20"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params?.next);

  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden bg-white">
      <LoginDecorations />
      <main className="relative z-10 min-h-[calc(100vh-5.5rem)] w-full">
        <div className="mx-auto flex w-full max-w-[1440px] justify-center px-4 pt-[157px] pb-16 xl:justify-start xl:px-0 xl:pl-[494px]">
          <LoginForm nextPath={nextPath} />
        </div>
      </main>
    </div>
  );
}
