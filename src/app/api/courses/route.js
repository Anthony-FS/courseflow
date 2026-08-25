import { jsonError, jsonOk } from "@/lib/api";
import { getCatalogCourses, parseCatalogPageSize } from "@/lib/courses";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") ?? "");
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = parseCatalogPageSize(searchParams.get("pageSize"));

  if (pageSize == null || !Number.isInteger(page) || page < 1) {
    return jsonError("Invalid page or page size", 400);
  }

  const supabase = createServiceClient() ?? (await createClient());

  try {
    const result = await getCatalogCourses(supabase, {
      query,
      page,
      pageSize,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error.message || "Failed to load courses", 500);
  }
}
