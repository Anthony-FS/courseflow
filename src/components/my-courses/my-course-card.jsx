import { WishlistCard } from "@/components/wishlist/wishlist-card";

export function MyCourseCard({ course }) {
  return (
    <WishlistCard
      course={course}
      href={`/courses/${encodeURIComponent(course.code)}/learn`}
      progress={course.progress ?? 0}
      isEnrolled
    />
  );
}
