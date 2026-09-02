import { calculatePromoPricing } from "@/lib/promo-validate";
import { createClient } from "@/lib/supabase/server";

// Use the caller's session: the RPC checks auth.uid(), course scope, dates
// and a shared database rate limit. Never fall back to direct SELECT.
export async function resolvePromoTotal({ code, courseId, subtotal }) {
  if (!code) {
    return {
      error: null,
      total: Number(subtotal) || 0,
      discountAmount: 0,
      promoCode: "",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_checkout_promo", {
    p_code: code,
    p_course_id: courseId,
  });

  if (error || !data) {
    return { error: "Promo validation is temporarily unavailable.", status: 503 };
  }
  if (data.error) return data;

  const promo = data.promo;
  const pricing = calculatePromoPricing({
    subtotal: data.subtotal,
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
