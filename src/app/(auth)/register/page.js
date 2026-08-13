import { AuthShapes } from "@/components/auth/auth-shapes";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Register | CourseFlow",
  description: "Create a CourseFlow account to start learning.",
};

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex-1 overflow-x-hidden bg-white">
      <AuthShapes />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <RegisterForm />
      </main>
    </div>
  );
}
