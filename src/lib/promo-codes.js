import { createClient } from "@/lib/supabase/client";

async function parseJson(response) {
  try { return await response.json(); } catch { return null; }
}

export async function getAdminPromoCodesPage({ query = "", page = 1, pageSize = 10, sortBy = "code", sortDirection = "asc" } = {}) {
  const params = new URLSearchParams({ q: query, page: String(page), pageSize: String(pageSize), sortBy, sortDirection });
  const response = await fetch(`/api/admin/promo-codes?${params}`, { cache: "no-store" });
  const data = await parseJson(response);
  if (!response.ok) throw new Error(data?.error || "Failed to load promo codes.");
  return data;
}

export async function getPromoCodes() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, min_purchase_amount, course_id, is_active, starts_at, updated_at, promo_code_courses(course_id, courses(course_code))")
    .order("code");

  if (error) {
    throw new Error(error.message || "Failed to load promo codes.");
  }

  return (data ?? []).map((promo) => {
    const linkedCourseCodes = (promo.promo_code_courses ?? [])
      .map((link) => link.courses?.course_code)
      .filter(Boolean);
    const courseCodes = [...new Set(linkedCourseCodes)];

    return {
      ...promo,
      courseCodes,
      appliesToAllCourses: !promo.course_id && courseCodes.length === 0,
    };
  });
}

export async function getPromoCourseOptions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_code")
    .order("course_code");

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
    const courseCodes = promo.courseCodes?.join(" ") || "All";
    return `${promo.code} ${promo.discount_type} ${courseCodes}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function filterPromoCodesByStatus(promoCodes, status = "all") {
  if (status === "active") {
    return promoCodes.filter((promo) => promo.is_active !== false);
  }

  if (status === "inactive") {
    return promoCodes.filter((promo) => promo.is_active === false);
  }

  return promoCodes;
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

export async function updatePromoCodeStatus(promoId, isActive) {
  const response = await fetch(`/api/admin/promo-codes/${promoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to update promo code status.");
  }

  return data;
}
