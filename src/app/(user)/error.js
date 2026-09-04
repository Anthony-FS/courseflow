"use client";

import { useEffect } from "react";
import Link from "next/link";

import Footer from "@/components/footer";
import StatusPage from "@/components/status-page";

/**
 * Route-level error boundary for the (user) group. error.js does not wrap the
 * layout.js in its own segment, so this renders inside (user)/layout.js and
 * inherits the real <Navbar /> — including its server-resolved auth state.
 * The footer is added here, matching how the pages in this group render it.
 */
export default function UserError({ error, retry }) {
  useEffect(() => {
    // The app has no error reporting service; keep Next's console reporting.
    console.error(error);
  }, [error]);

  return (
    <>
      <StatusPage
        heading="Oops, something went wrong"
        body="We could not load this page. Please try again in a moment."
      >
        <button
          type="button"
          className="inline-flex min-h-15 min-w-48.25 items-center justify-center rounded-lg bg-blue-500 px-8 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
          onClick={() => retry()}
        >
          Try again
        </button>
        <Link
          className="inline-flex min-h-15 min-w-48.25 items-center justify-center rounded-lg border border-orange-500 bg-white px-8 font-medium text-orange-500 shadow-button transition duration-200 hover:-translate-y-px hover:border-orange-100 hover:text-orange-100"
          href="/"
        >
          Back to Home
        </Link>
      </StatusPage>
      <Footer />
    </>
  );
}
