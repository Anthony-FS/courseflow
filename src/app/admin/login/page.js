import { AdminLoginForm } from "@/components/auth/admin-login-form";
import Logo from "@/components/ui/logo";

export const metadata = {
  title: "Admin Log in | CourseFlow",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear2 px-4 py-12">
      <main className="w-full max-w-[453px] rounded-2xl bg-white px-8 py-10 shadow-popover sm:px-10">
        <div className="mb-8 flex justify-center text-center [&_p]:text-center">
          <Logo
            href="/admin/login"
            className="w-fit"
            width={280}
            height={36}
          />
        </div>
        <AdminLoginForm />
      </main>
    </div>
  );
}
