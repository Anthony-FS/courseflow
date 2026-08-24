import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { validatePromoCodeAmounts } from "@/lib/promo-code-validation";

function normalize(body) {
  const code = String(body.code ?? "").trim().toUpperCase();
  const discountType = body.discountType === "thb" ? "fixed" : String(body.discountType ?? "");
  const minPurchaseAmount = Number(body.minPurchaseAmount);
  const discountValue = Number(body.discountValue);
  const courseIds = Array.isArray(body.courseIds)
    ? body.courseIds.filter((courseId) => typeof courseId === "string" && courseId)
    : [];
  if (!/^[a-z0-9]+$/i.test(code)) return { error: "Promo code must contain alphabet and number characters only." };
  if (!Number.isInteger(minPurchaseAmount) || minPurchaseAmount < 0) return { error: "Minimum purchase amount must be a non-negative number." };
  if (!["fixed", "percent"].includes(discountType)) return { error: "Invalid discount type." };
  const amountValidation = validatePromoCodeAmounts({
    discountType,
    discountValue,
    minPurchaseAmount,
  });
  if (amountValidation.error) return { error: amountValidation.error };
  return { code, discountType, minPurchaseAmount, discountValue, courseIds: [...new Set(courseIds)] };
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data, error: queryError } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, min_purchase_amount, course_id, starts_at, updated_at, promo_code_courses(course_id, courses(course_code))")
    .eq("id", (await params).id)
    .single();
  if (queryError) return jsonError(queryError.message, 404);
  const courseIds = (data.promo_code_courses ?? []).map((link) => link.course_id);
  return jsonOk({
    ...data,
    courseIds: courseIds.length > 0 ? courseIds : (data.course_id ? [data.course_id] : []),
  });
}

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const normalized = normalize(await request.json());
  if (normalized.error) return jsonError(normalized.error, 400);
  const promoId = (await params).id;
  const { data, error: updateError } = await supabase
    .from("promo_codes")
    .update({
      code: normalized.code,
      discount_type: normalized.discountType,
      discount_value: normalized.discountValue,
      min_purchase_amount: normalized.minPurchaseAmount,
      course_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", promoId)
    .select("id")
    .single();
  if (updateError?.code === "23505") return jsonError("Promo code already exists.", 409);
  if (updateError) return jsonError(updateError.message, 500);

  const { error: deleteRelationsError } = await supabase
    .from("promo_code_courses")
    .delete()
    .eq("promo_code_id", promoId);
  if (deleteRelationsError) return jsonError(deleteRelationsError.message, 500);

  if (normalized.courseIds.length > 0) {
    const { error: relationError } = await supabase
      .from("promo_code_courses")
      .insert(normalized.courseIds.map((courseId) => ({
        promo_code_id: promoId,
        course_id: courseId,
      })));
    if (relationError) return jsonError(relationError.message, 500);
  }

  return jsonOk(data);
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { error: deleteError } = await supabase.from("promo_codes").delete().eq("id", (await params).id);
  if (deleteError) return jsonError(deleteError.message, 500);
  return jsonOk({ ok: true });
}
