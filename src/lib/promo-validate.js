import { MINIMUM_CUSTOMER_PAYMENT } from "@/lib/promo-code-validation";

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function promoAppliesToCourse(promo, courseId) {
  if (!courseId) return false;

  const linkedIds = (promo.promo_code_courses ?? [])
    .map((link) => link.course_id)
    .filter(Boolean);

  if (linkedIds.length > 0) {
    return linkedIds.includes(courseId);
  }

  if (promo.course_id) {
    return promo.course_id === courseId;
  }

  return true;
}

export function isPromoCurrentlyValid(promo, now = new Date()) {
  if (!promo?.is_active) return false;

  if (promo.starts_at) {
    const startsAt = new Date(promo.starts_at);
    if (!Number.isNaN(startsAt.getTime()) && startsAt > now) {
      return false;
    }
  }

  if (promo.ends_at) {
    const endsAt = new Date(promo.ends_at);
    if (!Number.isNaN(endsAt.getTime()) && endsAt < now) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates discount and payable total for a validated promo against a subtotal.
 */
export function calculatePromoPricing({
  subtotal,
  discountType,
  discountValue,
  minPurchaseAmount = 0,
}) {
  const amount = roundMoney(subtotal);
  const discount = Number(discountValue);
  const minimumPurchase = Number(minPurchaseAmount) || 0;

  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Invalid subtotal." };
  }

  if (!Number.isFinite(discount) || discount < 0) {
    return { error: "Invalid discount value." };
  }

  if (amount < minimumPurchase) {
    return {
      error: `This promo requires a minimum purchase of ${minimumPurchase} THB.`,
    };
  }

  let discountAmount = 0;
  if (discountType === "percent") {
    discountAmount = roundMoney((amount * discount) / 100);
  } else if (discountType === "fixed" || discountType === "thb") {
    discountAmount = roundMoney(discount);
  } else {
    return { error: "Invalid discount type." };
  }

  discountAmount = Math.min(discountAmount, amount);
  let total = roundMoney(amount - discountAmount);

  if (total > 0 && total < MINIMUM_CUSTOMER_PAYMENT) {
    total = MINIMUM_CUSTOMER_PAYMENT;
    discountAmount = roundMoney(amount - total);
  }

  return {
    error: null,
    subtotal: amount,
    discountAmount,
    total,
  };
}
