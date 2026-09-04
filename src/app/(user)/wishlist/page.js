import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";

import Footer from "@/components/footer";
import { WishlistCourseList } from "@/components/wishlist/wishlist-course-list";
import { WishlistDecorations } from "@/components/wishlist/wishlist-decorations";
import { getSessionUser } from "@/lib/auth";
import { getUserWishlist } from "@/lib/wishlist";

export const metadata = {
  title: "My Wishlist | CourseFlow",
};

export default async function MyWishlistPage() {
  const { user, supabase } = await getSessionUser();

  if (!user) {
    redirect("/login?next=/wishlist");
  }

  const courses = await getUserWishlist(supabase, user.id);

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="relative flex-1 overflow-hidden" aria-label="My Wishlist">
        <WishlistDecorations />

        <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-280 py-10 sm:py-16">
          <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
            My Wishlist
          </h1>

          <WishlistCourseList initialCourses={courses} />
        </div>
      </main>


      <Footer />
    </div>
  );
}
