import { jsonError, jsonOk } from "@/lib/api";
import { normalizePromoCode } from "@/lib/promo-codes";
import { resolvePromoTotal } from "@/lib/promo-lookup";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const code = normalizePromoCode(body.code);
  const courseId = String(body.courseId ?? "").trim();
  const subtotal = Number(body.subtotal);

  if (!code) {
    return jsonError("Promo code is required.", 400);
  }

  if (!courseId) {
    return jsonError("Course id is required.", 400);
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return jsonError("Subtotal must be a non-negative number.", 400);
  }

  const result = await resolvePromoTotal({ code, courseId, subtotal });
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
