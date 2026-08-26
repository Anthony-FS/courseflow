export default function CourseDetailLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-1 flex-col bg-white max-lg:has-[[data-course-purchase-bar]]:[&_footer]:pb-48">
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
