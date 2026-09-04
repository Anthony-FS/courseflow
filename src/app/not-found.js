import Link from "next/link";

import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import StatusPage from "@/components/status-page";

export const metadata = {
  title: "Page not found | CourseFlow",
};

/**
 * Root not-found: Next renders this for any unmatched URL, with a 404 status.
 * It sits outside the (user) route group, so it brings its own navbar/footer
 * the same way the pages in that group already render the footer themselves.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <StatusPage
        heading="Oops, page not found"
        body="The page you were looking for does not exist or has been removed."
      >
        <Link
          className="inline-flex min-h-15 min-w-48.25 items-center justify-center rounded-lg bg-blue-500 px-8 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
          href="/"
        >
          Back to Home
        </Link>
        <Link
          className="inline-flex min-h-15 min-w-48.25 items-center justify-center rounded-lg border border-orange-500 bg-white px-8 font-medium text-orange-500 shadow-button transition duration-200 hover:-translate-y-px hover:border-orange-100 hover:text-orange-100"
          href="/courses"
        >
          Browse Courses
        </Link>
      </StatusPage>
      <Footer />
    </>
  );
}
