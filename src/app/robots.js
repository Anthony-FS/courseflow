const SITE_URL = "https://courseflow-client-two.vercel.app";

/**
 * Paths that should never reach a search index: route handlers, the Supabase
 * email-link handler, the admin console, and every page that redirects a
 * signed-out visitor to /login.
 *
 * `/courses/` (with the trailing slash) covers the course detail and learn
 * pages without blocking the public `/courses` catalog, which does not match
 * the prefix.
 */
const DISALLOWED_PATHS = [
  "/api/",
  "/auth/",
  "/admin",
  "/courses/",
  "/my-courses",
  "/wishlist",
  "/profile",
  "/payment",
  "/assignments",
];

export default function robots() {
  // Vercel preview and development deployments must stay out of search results.
  if (process.env.VERCEL_ENV !== "production") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
