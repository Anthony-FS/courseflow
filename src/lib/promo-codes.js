import { createClient } from "@/lib/supabase/client";

export async function getPromoCodes() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, min_purchase_amount, course_id, starts_at, courses(title)")
    .order("code");

  if (error) {
    throw new Error(error.message || "Failed to load promo codes.");
  }

  return data ?? [];
}

export async function getPromoCourseOptions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  if (error) {
    throw new Error(error.message || "Failed to load courses.");
  }

  return data ?? [];
}

export function searchPromoCodes(promoCodes, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return promoCodes;
  }

  return promoCodes.filter((promo) => {
    const courseTitle = promo.courses?.title ?? "All";
    return `${promo.code} ${promo.discount_type} ${courseTitle}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export const PROMO_CODE_PATTERN = /^[a-z0-9]+$/i;

export function digitsOnly(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

export function normalizePromoCode(value) {
  return String(value ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
}

export function clampPercentDiscount(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return String(Math.min(Math.max(n, 0), 100));
}
