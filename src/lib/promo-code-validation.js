export const MINIMUM_CUSTOMER_PAYMENT = 100;
export const PROMO_CODE_MAX_LENGTH = 64;
export const PROMO_COURSE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePromoInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid promo request." };
  }
  const code = String(body.code ?? "").trim().toUpperCase();
  const discountType = body.discountType === "thb" ? "fixed" : String(body.discountType ?? "");
  const minPurchaseAmount = Number(body.minPurchaseAmount);
  const discountValue = Number(body.discountValue);
  const courseIds = body.courseIds ?? [];

  if (!/^[a-z0-9]+$/i.test(code) || code.length > PROMO_CODE_MAX_LENGTH) {
    return { error: `Promo code must contain 1–${PROMO_CODE_MAX_LENGTH} letters or numbers.` };
  }
  if (!Array.isArray(courseIds) || courseIds.some((id) => typeof id !== "string" || !PROMO_COURSE_ID_PATTERN.test(id))) {
    return { error: "Select valid courses for this promo code." };
  }
  if (!Number.isInteger(minPurchaseAmount) || minPurchaseAmount < 0) {
    return { error: "Minimum purchase amount must be a non-negative number." };
  }
  if (!["fixed", "percent"].includes(discountType)) {
    return { error: "Invalid discount type." };
  }
  const amounts = validatePromoCodeAmounts({ discountType, discountValue, minPurchaseAmount });
  if (amounts.error) return amounts;
  return { code, discountType, discountValue, minPurchaseAmount, courseIds: [...new Set(courseIds)] };
}

/**
 * Returns the minimum order amount required for a fixed discount so the
 * customer's payment remains at least the configured minimum.
 */
export function getRequiredMinimumPurchase(discountType, discountValue) {
  if (discountType !== "fixed") return null;

  const discount = Number(discountValue);
  if (!Number.isFinite(discount) || discount < 0) return null;

  return Math.ceil(discount + MINIMUM_CUSTOMER_PAYMENT);
}

/**
 * Validates promo-code amounts shared by the admin API and admin forms.
 */
export function validatePromoCodeAmounts({
  discountType,
  discountValue,
  minPurchaseAmount,
}) {
  const discount = Number(discountValue);
  const minimumPurchase = Number(minPurchaseAmount);

  if (!Number.isFinite(discount) || discount < 0) {
    return { error: "Discount value must be a non-negative number." };
  }

  if (!Number.isFinite(minimumPurchase) || minimumPurchase < 0) {
    return { error: "Minimum purchase amount must be a non-negative number." };
  }

  if (discountType === "percent" && discount > 100) {
    return { error: "Percentage discount cannot exceed 100%." };
  }

  if (discountType === "fixed") {
    const requiredMinimumPurchase = getRequiredMinimumPurchase(
      discountType,
      discount,
    );
    if (minimumPurchase < requiredMinimumPurchase) {
      return {
        error: `Minimum purchase amount must be at least ${requiredMinimumPurchase} THB for this discount.`,
      };
    }
  }

  return { error: null };
}
