import {
  calculatePromoPricing,
  isPromoCurrentlyValid,
  promoAppliesToCourse,
} from "@/lib/promo-validate";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function getPromoLookupClient() {
  const service = createServiceClient();
  if (service) return service;
  return createClient();
}

export async function resolvePromoTotal({ code, courseId, subtotal }) {
  if (!code) {
    return {
      error: null,
      total: Number(subtotal) || 0,
      discountAmount: 0,
      promoCode: "",
    };
  }

  const supabase = await getPromoLookupClient();
  const { data: promo, error: promoError } = await supabase
    .from("promo_codes")
    .select(
      "id, code, discount_type, discount_value, min_purchase_amount, course_id, starts_at, ends_at, is_active, promo_code_courses(course_id)",
    )
    .eq("code", code)
    .maybeSingle();

  if (promoError) {
    return {
      error: promoError.message || "Failed to validate promo code.",
      status: 500,
    };
  }

  if (!promo) {
    return { error: "Promo code not found.", status: 404 };
  }

  if (!isPromoCurrentlyValid(promo)) {
    return { error: "This promo code is not active.", status: 400 };
  }

  if (!promoAppliesToCourse(promo, courseId)) {
    return {
      error: "This promo code does not apply to this course.",
      status: 400,
    };
  }

  const pricing = calculatePromoPricing({
    subtotal,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    minPurchaseAmount: promo.min_purchase_amount,
  });

  if (pricing.error) {
    return { error: pricing.error, status: 400 };
  }

  return {
    error: null,
    total: pricing.total,
    discountAmount: pricing.discountAmount,
    promoCode: promo.code,
    promo,
    pricing,
  };
}
