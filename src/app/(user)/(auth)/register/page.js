import { LoginDecorations } from "@/components/auth/auth-background";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Register | CourseFlow",
  description: "Create a CourseFlow account to start learning.",
};

export default function RegisterPage() {
  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] flex-1 overflow-hidden bg-white">
      <LoginDecorations />
      <main className="relative z-10 flex min-h-[calc(100vh-5.5rem)] items-start justify-center px-4 pt-8 pb-16 md:items-center md:py-16">
        <RegisterForm />
      </main>
    </div>
  );
}
