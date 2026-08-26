import { LoginDecorations } from "@/components/auth/auth-background";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Forgot password | CourseFlow",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden bg-white">
      <LoginDecorations />
      <main className="relative z-10 min-h-[calc(100vh-5.5rem)] w-full">
        <div className="mx-auto flex w-full max-w-[1440px] justify-center px-4 pt-[157px] pb-16 xl:justify-start xl:px-0 xl:pl-[494px]">
          <ForgotPasswordForm />
        </div>
      </main>
    </div>
  );
}
