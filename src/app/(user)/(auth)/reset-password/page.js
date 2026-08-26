import { Suspense } from "react";

import { LoginDecorations } from "@/components/auth/auth-background";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Reset password | CourseFlow",
};

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden bg-white">
      <LoginDecorations />
      <main className="relative z-10 min-h-[calc(100vh-5.5rem)] w-full">
        <div className="mx-auto flex w-full max-w-[1440px] justify-center px-4 pt-[157px] pb-16 xl:justify-start xl:px-0 xl:pl-[494px]">
          <Suspense
            fallback={
              <div className="flex h-fit min-h-[200px] w-[453px] max-w-full flex-col">
                <h1 className="text-[36px] leading-[125%] font-medium tracking-[-0.02em] text-[#22269E]">
                  Reset password
                </h1>
                <p className="mt-6 text-body2 text-gray-700">
                  Checking reset link…
                </p>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
