// The database saves the promo row and its course links in one transaction.
export async function saveAdminPromo(supabase, id, promo) {
  const { data, error } = await supabase.rpc("save_admin_promo", {
    p_id: id,
    p_code: promo.code,
    p_discount_type: promo.discountType,
    p_discount_value: promo.discountValue,
    p_min_purchase_amount: promo.minPurchaseAmount,
    p_course_ids: promo.courseIds,
  });
  if (error?.code === "23505") return { error: "Promo code already exists.", status: 409 };
  if (error?.code === "P0002") return { error: "Promo code not found.", status: 404 };
  if (error?.code === "42501") return { error: "Forbidden", status: 403 };
  if (["23503", "22023", "22P02"].includes(error?.code)) {
    return { error: "Invalid promo code or selected courses.", status: 400 };
  }
  if (error || !data) return { error: "Unable to save promo code. Please try again.", status: 503 };
  return { id: data };
}
