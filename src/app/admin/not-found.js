import { AdminBackButton } from "@/components/admin/admin-back-button";
import StatusPage from "@/components/status-page";

/**
 * 404 UI for the admin segment. Rendered inside admin/layout.js, so it keeps
 * the admin chrome instead of the public navbar and footer.
 *
 * A nested not-found.js only catches notFound() calls from its own segment —
 * unmatched URLs are handled by the root app/not-found.js. The catch-all at
 * admin/[...adminNotFound] is what routes stray /admin/* URLs into this file.
 */
export default function AdminNotFound() {
  return (
    <StatusPage
      className="bg-transparent"
      heading="Oops, page not found"
      body="The page you were looking for does not exist or has been removed."
    >
      <AdminBackButton />
    </StatusPage>
  );
}
