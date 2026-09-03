import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { resolveLessonVideoHref } from "@/lib/courses";

/**
 * Sign a private lesson video so the admin lesson editor can preview it.
 * Limited to the course-videos bucket; every other media kind is public.
 */
export async function GET(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const fileUrl = new URL(request.url).searchParams.get("path") ?? "";
  if (!fileUrl.trim()) {
    return jsonError("Missing path", 400);
  }

  const signedUrl = await resolveLessonVideoHref(supabase, fileUrl);
  if (!signedUrl) {
    return jsonError("Unable to sign media", 404);
  }

  return jsonOk({ signedUrl });
}
