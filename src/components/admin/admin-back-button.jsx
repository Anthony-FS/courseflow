"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// /admin redirects here, and the proxy uses it as its post-login destination,
// so this is the real admin landing route.
const ADMIN_HOME = "/admin/courses";

/**
 * "Return to previous page" for the admin 404. Falls back to the admin landing
 * route when there is no history to return to (fresh tab, pasted URL, external
 * link), so the button is never dead.
 */
export function AdminBackButton() {
  const router = useRouter();
  const fallbackTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(fallbackTimer.current);
  }, []);

  const handleClick = useCallback(() => {
    // The Navigation API answers this directly where it exists; history.length
    // is the fallback everywhere else.
    const canGoBack =
      typeof window.navigation?.canGoBack === "boolean"
        ? window.navigation.canGoBack
        : window.history.length > 1;

    if (!canGoBack) {
      router.replace(ADMIN_HOME);
      return;
    }

    router.back();

    // If back() had nowhere to go inside the app, this page is still mounted a
    // moment later; leaving the site instead unmounts it and clears the timer.
    fallbackTimer.current = setTimeout(() => {
      router.replace(ADMIN_HOME);
    }, 600);
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex min-h-15 min-w-48.25 items-center justify-center rounded-lg bg-blue-500 px-8 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400"
    >
      Return to previous page
    </button>
  );
}
