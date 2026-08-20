import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { validatePromoCodeAmounts } from "@/lib/promo-code-validation";

const CODE_PATTERN = /^[a-z0-9]+$/i;

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

  const promoRows = (courseIds.length > 0 ? courseIds : [null]).map((courseId) => ({
    course_id: courseId,
    code,
    discount_type: discountType,
    discount_value: discountValue,
    min_purchase_amount: minPurchaseAmount,
    starts_at: new Date().toISOString(),
    is_active: true,
  }));

  const { data, error: insertError } = await supabase
    .from("promo_codes")
    .insert(promoRows)
    .select("id")
    .limit(1);

  if (insertError) {
    if (insertError.code === "23505") {
      return jsonError("Promo code already exists.", 409);
    }
    return jsonError(insertError.message || "Failed to create promo code.", 500);
  }

  return jsonOk({ id: data?.[0]?.id ?? null }, { status: 201 });
}
