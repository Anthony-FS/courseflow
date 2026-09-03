import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { normalizePromoCode } from "@/lib/promo-codes";
import { PROMO_CODE_MAX_LENGTH, PROMO_COURSE_ID_PATTERN } from "@/lib/promo-code-validation";
import { resolvePromoTotal } from "@/lib/promo-lookup";

export async function POST(request) {
  const { error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid promo request", 400);
  }
  if (typeof body.code !== "string" || body.code.length > PROMO_CODE_MAX_LENGTH) {
    return jsonError(`Promo code must be at most ${PROMO_CODE_MAX_LENGTH} characters.`, 400);
  }
  const code = normalizePromoCode(body.code);
  const courseId = String(body.courseId ?? "").trim();

  if (!code) {
    return jsonError("Promo code is required.", 400);
  }

  if (!PROMO_COURSE_ID_PATTERN.test(courseId)) {
    return jsonError("A valid course id is required.", 400);
  }

  // Price comes from the database, never from the browser's subtotal.
  const result = await resolvePromoTotal({ code, courseId });
  if (result.status === 429) {
    return jsonTooManyRequests(result.retryAfterSec, result.error);
  }
  if (result.error) {
    return jsonError(result.error, result.status || 400);
  }

  return jsonOk({
    ok: true,
    code: result.promoCode,
    discountType: result.promo.discount_type,
    discountValue: Number(result.promo.discount_value),
    discountAmount: result.discountAmount,
    subtotal: result.pricing.subtotal,
    total: result.total,
    minPurchaseAmount: Number(result.promo.min_purchase_amount) || 0,
  });
}
