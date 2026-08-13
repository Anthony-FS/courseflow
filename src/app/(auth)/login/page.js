import { Plus } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Log in | CourseFlow",
};

function LoginDecorations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* วงกลมส้มฝั่งซ้าย — Figma: 113×418 / top 421 / left -20 / #FBAA1C */}
      <svg
        className="absolute top-[421px] left-[-20px] h-[418px] w-[113px]"
        viewBox="0 0 113 418"
        fill="#FBAA1C"
        aria-hidden
      >
        <circle cx="-137" cy="209" r="250" />
      </svg>

      {/* รูปทรงน้ำเงินฝั่งขวา — Figma: 172.64×617 / #2F5FAC */}
      <svg
        className="absolute top-0 right-0 h-[617px] w-[172.64px] text-blue-500"
        viewBox="0 0 173 617"
        fill="currentColor"
        aria-hidden
      >
        <path d="M173 0C95 35 8 95 6 200C4 310 70 490 173 617V0Z" />
      </svg>

      {/* วงกลมฟ้าอ่อนด้านบนซ้าย */}
      <div className="absolute top-28 left-10 size-[92px] rounded-full bg-blue-200 md:top-36 md:left-16 md:size-[130px]" />

      {/* เครื่องหมายบวกสีเขียวใกล้วงกลมฟ้าอ่อน */}
      <Plus
        className="absolute top-52 left-36 size-7 text-green md:top-64 md:left-52 md:size-10"
        strokeWidth={2.75}
      />

      {/* วงกลมกลวงฝั่งขวา — Figma: 35×35 / top 589 / left 1346 / border 3px #F47E20 */}
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

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <LoginDecorations />
      <Navbar />

      <main className="relative z-10 min-h-[calc(100vh-88px)] w-full">
        <div className="mx-auto flex w-full max-w-[1440px] justify-center px-4 pt-[157px] pb-16 xl:justify-start xl:px-0 xl:pl-[494px]">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
