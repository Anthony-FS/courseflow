const SITE_URL = "https://courseflow-client-two.vercel.app";

/**
 * Static, publicly reachable routes only.
 *
 * Deliberately excluded:
 * - /api/*, /auth/confirm — handlers, not pages
 * - /courses/[code] and /courses/[code]/learn — dynamic, and both redirect
 *   anonymous visitors to /login
 * - /my-courses, /wishlist, /profile, /profile/change-password, /payment —
 *   redirect to /login when signed out
 * - /admin/* — guarded by the proxy
 * - /assignments — placeholder page with no content yet
 * - /forgot-password, /reset-password — token-driven dead ends, nothing to index
 */
export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/courses`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
