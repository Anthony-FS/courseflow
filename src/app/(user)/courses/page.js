import Footer from "@/components/footer";
import { OurCoursesCatalog } from "@/components/courses/our-courses-catalog";
import { getSessionUser } from "@/lib/auth";
import { getUserWishlistCourseIds } from "@/lib/wishlist";

export const metadata = {
  title: "Our Courses | CourseFlow",
};

export default async function OurCoursesPage() {
  const { user, supabase } = await getSessionUser();
  const initialWishlistIds = user
    ? await getUserWishlistCourseIds(supabase, user.id)
    : [];

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="flex-1" aria-label="Our Courses">
        <section className="relative overflow-hidden">
          <div
            className="catalog-hero-decoration catalog-hero-decoration--circle"
            aria-hidden
          />
          <div
            className="catalog-hero-decoration catalog-hero-decoration--plus"
            aria-hidden
          >
            +
          </div>
          <div
            className="catalog-hero-decoration catalog-hero-decoration--triangle"
            aria-hidden
          />
          <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-280 pb-16 pt-12">
            <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
              Our Courses
            </h1>
            <OurCoursesCatalog initialWishlistIds={initialWishlistIds} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
