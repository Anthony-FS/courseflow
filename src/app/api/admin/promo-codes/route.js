import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import { normalizePromoInput } from "@/lib/promo-code-validation";
import { saveAdminPromo } from "@/lib/admin-promo-codes";
import {
  ADMIN_SEARCH_RATE_LIMIT,
  ADMIN_SEARCH_RATE_WINDOW_MS,
  adminSearchRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const PROMO_COLUMNS = "id, code, discount_type, discount_value, min_purchase_amount, course_id, starts_at, updated_at, promo_code_courses(course_id, courses(course_code))";
const PROMO_SORT_COLUMNS = {
  code: "code",
  minPurchase: "min_purchase_amount",
  discountValue: "discount_value",
  createdAt: "starts_at",
  updatedAt: "updated_at",
};

function mapPromoCode(promo) {
  const links = Array.isArray(promo.promo_code_courses) ? promo.promo_code_courses : [];
  const courseCodes = [...new Set(links.map((link) => {
    const course = Array.isArray(link.courses) ? link.courses[0] : link.courses;
    return course?.course_code;
  }).filter(Boolean))];

  return {
    ...promo,
    courseCodes,
    appliesToAllCourses: !promo.course_id && courseCodes.length === 0,
  };
}

export async function GET(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const limited = checkRateLimit(adminSearchRateLimitKey(getClientIp(request)), {
    limit: ADMIN_SEARCH_RATE_LIMIT,
    windowMs: ADMIN_SEARCH_RATE_WINDOW_MS,
  });
  if (!limited.allowed) return jsonTooManyRequests(limited.retryAfterSec);

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize")) || 10));
  const query = String(params.get("q") ?? "").trim();
  const sortColumn = PROMO_SORT_COLUMNS[params.get("sortBy")] ?? "code";
  const ascending = params.get("sortDirection") !== "desc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let promoIds = null;
  let linkedPromoIds = null;
  const isAllCoursesSearch = query.toLowerCase() === "all";
  if (query && !isAllCoursesSearch) {
    const escaped = query.replace(/[(),"]/g, " ").replaceAll("%", "\\%").replaceAll("_", "\\_");
    const { data: linkedRows, error: linkedError } = await supabase
      .from("promo_code_courses")
      .select("promo_code_id, courses!inner(course_code)")
      .ilike("courses.course_code", `%${escaped}%`);
    if (linkedError) return jsonError(linkedError.message || "Failed to search promo codes", 500);
    promoIds = (linkedRows ?? []).map((row) => row.promo_code_id).filter(Boolean);
  }

  if (isAllCoursesSearch) {
    const { data: linkedRows, error: linkedError } = await supabase
      .from("promo_code_courses")
      .select("promo_code_id");
    if (linkedError) return jsonError(linkedError.message || "Failed to search promo codes", 500);
    linkedPromoIds = [...new Set((linkedRows ?? []).map((row) => row.promo_code_id).filter(Boolean))];
  }

  let queryBuilder = supabase
    .from("promo_codes")
    .select(PROMO_COLUMNS, { count: "exact" });

  if (isAllCoursesSearch) {
    queryBuilder = queryBuilder.is("course_id", null);
    if (linkedPromoIds.length > 0) {
      queryBuilder = queryBuilder.not("id", "in", `(${linkedPromoIds.join(",")})`);
    }
  } else if (query) {
    const escaped = query.replace(/[(),"]/g, " ").replaceAll("%", "\\%").replaceAll("_", "\\_");
    if (promoIds.length > 0) {
      queryBuilder = queryBuilder.or(`code.ilike.%${escaped}%,discount_type.ilike.%${escaped}%,id.in.(${promoIds.join(",")})`);
    } else {
      queryBuilder = queryBuilder.or(`code.ilike.%${escaped}%,discount_type.ilike.%${escaped}%`);
    }
  }

  const { data, count, error: queryError } = await queryBuilder
    .order(sortColumn, { ascending })
    .range(from, to);
  if (queryError) return jsonError(queryError.message || "Failed to load promo codes", 500);

  return jsonOk({ promoCodes: (data ?? []).map(mapPromoCode), total: count ?? 0, page, pageSize });
}

export async function POST(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const normalized = normalizePromoInput(body);
  if (normalized.error) return jsonError(normalized.error, 400);
  const result = await saveAdminPromo(supabase, null, normalized);
  if (result.error) return jsonError(result.error, result.status);
  return jsonOk({ id: result.id }, { status: 201 });
}
