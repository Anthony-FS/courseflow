import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Footer from "@/components/footer";
import { PaymentForm } from "@/components/payment/payment-form";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Payment | CourseFlow",
  description: "Enter payment info to start your subscription.",
};

export default async function PaymentPage({ searchParams }) {
  const params = await searchParams;
  const courseId = String(params.courseId ?? "").trim();
  const paymentPath = courseId
    ? `/payment?courseId=${encodeURIComponent(courseId)}`
    : "/payment";

  const { user, supabase } = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(paymentPath)}`);
  }

  if (!courseId) {
    notFound();
  }

  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title, price, course_code")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course?.id) {
    notFound();
  }

  const coursePath = `/courses/${encodeURIComponent(course.course_code || course.id)}`;

  return (
    <>
      <main className="mx-auto w-[calc(100%-3rem)] max-w-280 pb-16 pt-8">
        <Link
          href={coursePath}
          className="inline-flex items-center gap-2 text-body2 font-medium text-blue-500 hover:text-blue-400"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Back
        </Link>

        <h1 className="mt-8 max-w-3xl text-headline2 font-medium tracking-[-0.02em] text-black">
          Enter payment info to start your subscription
        </h1>

        <div className="mt-10">
          <PaymentForm
            course={{
              id: course.id,
              title: course.title,
              price: Number(course.price) || 0,
              courseCode: course.course_code || course.id,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
