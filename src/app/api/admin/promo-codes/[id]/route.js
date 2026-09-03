import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { normalizePromoInput } from "@/lib/promo-code-validation";
import { saveAdminPromo } from "@/lib/admin-promo-codes";

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data, error: queryError } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, min_purchase_amount, course_id, is_active, starts_at, updated_at, promo_code_courses(course_id, courses(course_code))")
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

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const promoId = (await params).id;

  if (typeof body?.isActive === "boolean") {
    const { data, error: updateError } = await supabase
      .from("promo_codes")
      .update({
        is_active: body.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", promoId)
      .select("id, is_active")
      .maybeSingle();

    if (updateError) {
      return jsonError(updateError.message || "Failed to update promo code status.", 500);
    }

    if (!data?.id) {
      return jsonError("Promo code not found.", 404);
    }

    return jsonOk({
      id: data.id,
      is_active: data.is_active !== false,
      success: true,
    });
  }

  const normalized = normalizePromoInput(body);
  if (normalized.error) return jsonError(normalized.error, 400);
  const result = await saveAdminPromo(supabase, promoId, normalized);
  if (result.error) return jsonError(result.error, result.status);
  return jsonOk({ id: result.id });
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { error: deleteError } = await supabase.from("promo_codes").delete().eq("id", (await params).id);
  if (deleteError) return jsonError(deleteError.message, 500);
  return jsonOk({ ok: true });
}
