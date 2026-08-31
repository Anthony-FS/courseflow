import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import { validatePromoCodeAmounts } from "@/lib/promo-code-validation";
import {
  ADMIN_SEARCH_RATE_LIMIT,
  ADMIN_SEARCH_RATE_WINDOW_MS,
  adminSearchRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const CODE_PATTERN = /^[a-z0-9]+$/i;

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
  if (query) {
    const escaped = query.replace(/[(),"]/g, " ").replaceAll("%", "\\%").replaceAll("_", "\\_");
    const { data: linkedRows, error: linkedError } = await supabase
      .from("promo_code_courses")
      .select("promo_code_id, courses!inner(course_code)")
      .ilike("courses.course_code", `%${escaped}%`);
    if (linkedError) return jsonError(linkedError.message || "Failed to search promo codes", 500);
    promoIds = (linkedRows ?? []).map((row) => row.promo_code_id).filter(Boolean);
  }

  let queryBuilder = supabase
    .from("promo_codes")
    .select(PROMO_COLUMNS, { count: "exact" });

  if (query) {
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

  const code = String(body.code ?? "").trim().toUpperCase();
  const minPurchaseAmount = Number(body.minPurchaseAmount);
  const requestedDiscountType = String(body.discountType ?? "");
  // The database constraint uses fixed; thb is the legacy UI value.
  const discountType = requestedDiscountType === "thb"
    ? "fixed"
    : requestedDiscountType;
  const courseIds = Array.isArray(body.courseIds)
    ? body.courseIds.filter((courseId) => typeof courseId === "string" && courseId)
    : [];
  const discountValue = Number(body.discountValue);

  if (!CODE_PATTERN.test(code)) {
    return jsonError("Promo code must contain alphabet and number characters only.", 400);
  }
  if (!Number.isInteger(minPurchaseAmount) || minPurchaseAmount < 0) {
    return jsonError("Minimum purchase amount must be a non-negative number.", 400);
  }
  if (!["fixed", "percent"].includes(discountType)) {
    return jsonError("Invalid discount type.", 400);
  }
  const amountValidation = validatePromoCodeAmounts({
    discountType,
    discountValue,
    minPurchaseAmount,
  });
  if (amountValidation.error) {
    return jsonError(amountValidation.error, 400);
  }

  const promoRow = {
    // A null legacy course_id means the code is not restricted to one course.
    // Specific course scope is stored in promo_code_courses below.
    course_id: null,
    code,
    discount_type: discountType,
    discount_value: discountValue,
    min_purchase_amount: minPurchaseAmount,
    starts_at: new Date().toISOString(),
    is_active: true,
  };

  const { data, error: insertError } = await supabase
    .from("promo_codes")
    .insert(promoRow)
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return jsonError("Promo code already exists.", 409);
    }
    return jsonError(insertError.message || "Failed to create promo code.", 500);
  }

  if (courseIds.length > 0) {
    const { error: relationError } = await supabase
      .from("promo_code_courses")
      .insert(courseIds.map((courseId) => ({
        promo_code_id: data.id,
        course_id: courseId,
      })));

    if (relationError) {
      await supabase.from("promo_codes").delete().eq("id", data.id);
      return jsonError(relationError.message || "Failed to assign promo code to courses.", 500);
    }
  }

  return jsonOk({ id: data?.id ?? null }, { status: 201 });
}
