import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

function normalize(body) {
  const code = String(body.code ?? "").trim().toUpperCase();
  const discountType = body.discountType === "thb" ? "fixed" : String(body.discountType ?? "");
  const minPurchaseAmount = Number(body.minPurchaseAmount);
  const discountValue = Number(body.discountValue);
  if (!/^[a-z0-9]+$/i.test(code)) return { error: "Promo code must contain alphabet and number characters only." };
  if (!Number.isInteger(minPurchaseAmount) || minPurchaseAmount < 0) return { error: "Minimum purchase amount must be a non-negative number." };
  if (!["fixed", "percent"].includes(discountType)) return { error: "Invalid discount type." };
  if (!Number.isInteger(discountValue) || discountValue < 0 || (discountType === "percent" && discountValue > 100)) return { error: "Invalid discount value." };
  return { code, discountType, minPurchaseAmount, discountValue };
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data, error: queryError } = await supabase.from("promo_codes").select("id, code, discount_type, discount_value, min_purchase_amount, course_id, starts_at").eq("id", (await params).id).single();
  if (queryError) return jsonError(queryError.message, 404);
  return jsonOk(data);
}

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const normalized = normalize(await request.json());
  if (normalized.error) return jsonError(normalized.error, 400);
  const { data, error: updateError } = await supabase.from("promo_codes").update({ code: normalized.code, discount_type: normalized.discountType, discount_value: normalized.discountValue, min_purchase_amount: normalized.minPurchaseAmount }).eq("id", (await params).id).select("id").single();
  if (updateError) return jsonError(updateError.message, 500);
  return jsonOk(data);
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { error: deleteError } = await supabase.from("promo_codes").delete().eq("id", (await params).id);
  if (deleteError) return jsonError(deleteError.message, 500);
  return jsonOk({ ok: true });
}
