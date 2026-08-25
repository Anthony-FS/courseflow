import { redirect } from "next/navigation";

import Footer from "@/components/footer";
import { MyCoursesList } from "@/components/my-courses/my-courses-list";
import { WishlistDecorations } from "@/components/wishlist/wishlist-decorations";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "My Courses | CourseFlow",
};

export default async function MyCoursesPage() {
  const { user } = await getSessionUser();

  if (!user) {
    redirect("/login?next=/my-courses");
  }

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="relative flex-1 overflow-hidden" aria-label="My Courses">
        <WishlistDecorations />

        <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-280 py-10 sm:py-16">
          <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
            My Courses
          </h1>

          <MyCoursesList />
        </div>
      </main>

      <Footer />
    </div>
  );
}
