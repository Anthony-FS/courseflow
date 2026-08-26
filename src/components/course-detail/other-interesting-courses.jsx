import { WishlistCard } from "@/components/wishlist/wishlist-card";

function OtherInterestingCourses({
  courses = [],
  enrolledCourseIds = [],
  wishlistCourseIds = [],
}) {
  const list = Array.isArray(courses) ? courses.slice(0, 3) : [];
  const enrolledSet = new Set(enrolledCourseIds);
  const wishlistSet = new Set(wishlistCourseIds);

  if (list.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-gray-100 py-16"
      aria-labelledby="other-interesting-courses-heading"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-280">
        <h2
          id="other-interesting-courses-heading"
          className="text-center text-headline2 font-medium tracking-[-0.02em] text-black"
        >
          Other Interesting Courses
        </h2>

        <ul className="mt-10 flex flex-wrap justify-center gap-6">
          {list.map((course) => (
            <li
              key={course.id}
              className="flex w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <WishlistCard
                course={course}
                initiallySaved={wishlistSet.has(course.id)}
                isEnrolled={enrolledSet.has(course.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { OtherInterestingCourses };
