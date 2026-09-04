import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched URLs under /admin. Next resolves static segments
 * before a catch-all, so the real admin routes are unaffected; anything left
 * over lands here and throws into admin/not-found.js with a 404 status.
 */
export default function AdminNotFoundCatchAll() {
  notFound();
}
