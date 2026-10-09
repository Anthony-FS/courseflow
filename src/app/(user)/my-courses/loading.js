import Footer from "@/components/footer";
import { MyCoursesSkeleton } from "@/components/my-courses/my-courses-skeleton";
import { WishlistDecorations } from "@/components/wishlist/wishlist-decorations";

export default function MyCoursesLoading() {
  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="relative flex-1 overflow-hidden" aria-label="My Courses">
        <WishlistDecorations />
        <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-300 py-10 sm:py-16">
          <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
            My Courses
          </h1>
          <MyCoursesSkeleton />
        </div>
      </main>
      <Footer />
    </div>
  );
}
