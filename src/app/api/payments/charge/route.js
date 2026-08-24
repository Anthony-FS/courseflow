import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { enrollPaidUser, loadPayableCourse, upsertPaymentRecord } from "@/lib/payments";
import { toSatang } from "@/lib/mock-checkout";
import {
  createOmiseCharge,
  fetchQrDataUrl,
  getPromptPayQrUri,
  isOmiseChargePaid,
} from "@/lib/omise-server";
import { normalizePromoCode } from "@/lib/promo-codes";
import { resolvePromoTotal } from "@/lib/promo-lookup";

export async function POST(request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const paymentMethod = String(body.paymentMethod ?? "").trim();
  const courseId = String(body.courseId ?? "").trim();
  const promoCode = normalizePromoCode(body.promoCode);
  const omiseToken = String(body.omiseToken ?? "").trim();
  const sourceId = String(body.sourceId ?? body.omiseSourceId ?? "").trim();

  if (paymentMethod !== "card" && paymentMethod !== "qr") {
    return jsonError("Payment method must be card or qr.", 400);
  }

  if (!courseId) {
    return jsonError("Course id is required.", 400);
  }

  if (paymentMethod === "card" && !omiseToken) {
    return jsonError("Omise card token is required.", 400);
  }

  if (paymentMethod === "qr" && !sourceId) {
    return jsonError("Omise PromptPay source is required.", 400);
  }

  let course;
  try {
    course = await loadPayableCourse(supabase, courseId);
  } catch (courseError) {
    return jsonError(courseError.message || "Failed to load course.", 500);
  }

  if (!course) {
    return jsonError("Course not found.", 404);
  }

  const priced = await resolvePromoTotal({
    code: promoCode,
    courseId: course.id,
    subtotal: course.price,
  });

  if (priced.error) {
    return jsonError(priced.error, priced.status || 400);
  }

  const amountSatang = toSatang(priced.total);
  if (amountSatang < 2000) {
    return jsonError("Amount is below the Omise minimum (20 THB).", 400);
  }

  let charge;
  try {
    charge = await createOmiseCharge({
      amountSatang,
      cardToken: paymentMethod === "card" ? omiseToken : undefined,
      sourceId: paymentMethod === "qr" ? sourceId : undefined,
      metadata: {
        courseId: course.id,
        userId: user.id,
        promoCode: priced.promoCode,
        description: course.title,
      },
    });
  } catch (chargeError) {
    return jsonError(chargeError.message || "Payment failed.", chargeError.status || 400);
  }

  const paid = isOmiseChargePaid(charge);

  try {
    await upsertPaymentRecord(supabase, {
      userId: user.id,
      courseId: course.id,
      charge,
      method: paymentMethod,
      amount: priced.total,
      promoCode: priced.promoCode,
    });
  } catch (paymentError) {
    return jsonError(paymentError.message || "Failed to save payment.", 500);
  }

  let enrolled = false;
  let alreadyEnrolled = false;

  if (paymentMethod === "card" && paid) {
    try {
      const enrollment = await enrollPaidUser(user.id, course.id, supabase);
      enrolled = true;
      alreadyEnrolled = enrollment.already;
    } catch (enrollError) {
      return jsonError(
        enrollError.message || "Payment succeeded but enrollment failed.",
        500,
      );
    }
  }

  let qrImage = null;
  if (paymentMethod === "qr") {
    qrImage = await fetchQrDataUrl(getPromptPayQrUri(charge));
  }

  return jsonOk({
    ok: paymentMethod === "card" ? paid : Boolean(charge.id),
    status: charge.status,
    paid,
    enrolled,
    alreadyEnrolled,
    chargeId: charge.id,
    amount: priced.total,
    qrImage,
  });
}
