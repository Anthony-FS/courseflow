import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("course_tags")
    .select("slug, name")
    .order("name", { ascending: true });

  if (queryError) {
    return jsonError(queryError.message || "Failed to load course tags", 500);
  }

  const tags = (data ?? []).map((row) => ({
    slug: String(row?.slug ?? "").trim(),
    name: String(row?.name ?? "").trim(),
  })).filter((tag) => tag.slug && tag.name);

  return jsonOk({ tags });
}
