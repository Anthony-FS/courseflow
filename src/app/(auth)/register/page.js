import { LoginDecorations } from "@/components/auth/auth-shapes";
import { RegisterForm } from "./register-form";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Register | CourseFlow",
  description: "Create a CourseFlow account to start learning.",
};

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex-1 overflow-hidden bg-white">
      <LoginDecorations />
      <Navbar />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <RegisterForm />
      </main>
    </div>
  );
}
