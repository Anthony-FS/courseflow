import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";

import Footer from "@/components/footer";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
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

          {courses.length > 0 ? (
            <ul
              className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Wishlisted courses"
            >
              {courses.map((course) => (
                <li key={course.wishlistId || course.id} className="flex">
                  <WishlistCard course={course} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto mt-12 flex max-w-md flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card sm:p-12">
              <div className="grid size-16 place-items-center rounded-full bg-blue-100 text-blue-500">
                <Bookmark className="size-8" aria-hidden />
              </div>
              <h2 className="mt-4 text-headline3 font-medium text-black">
                No courses in your wishlist yet
              </h2>
              <p className="mt-2 text-body2 text-gray-700">
                Browse our catalog and save courses you want to learn later.
              </p>
              <Link
                href="/courses"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-blue-500 px-6 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
              >
                Explore Courses
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
