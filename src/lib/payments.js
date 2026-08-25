import { enrollUserInCourse } from "@/lib/enrollments";
import { isOmiseChargePaid } from "@/lib/omise-server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function loadPayableCourse(supabase, courseId) {
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, title, price")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load course.");
  }

  if (!course?.id) {
    return null;
  }

  const price = Number(course.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Course price is invalid.");
  }

  return {
    id: course.id,
    title: course.title,
    price,
  };
}

export async function enrollPaidUser(userId, courseId, supabase) {
  const client = supabase || createServiceClient();
  if (!client) {
    throw new Error(
      "Enrollment is unavailable. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  return enrollUserInCourse(client, userId, courseId);
}

export function mapPaymentStatus(charge) {
  if (isOmiseChargePaid(charge)) return "paid";
  if (charge?.status === "failed") return "failed";
  if (charge?.status === "expired") return "expired";
  return "pending";
}

export function paymentMethodFromCharge(charge, fallback = "card") {
  const sourceType = charge?.source?.type || charge?.source_type;
  if (sourceType === "promptpay") return "qr";
  if (charge?.card) return "card";
  return fallback;
}

function isMissingPaymentsTable(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.code === "42P01" || message.includes("could not find the table");
}

export async function upsertPaymentRecord(supabase, {
  userId,
  courseId,
  charge,
  method,
  amount,
  promoCode,
}) {
  if (!supabase || !charge?.id || !userId || !courseId) {
    return { skipped: true };
  }

  const status = mapPaymentStatus(charge);
  const row = {
    user_id: userId,
    course_id: courseId,
    omise_charge_id: charge.id,
    amount,
    currency: String(charge.currency || "thb").toLowerCase(),
    method,
    status,
    promo_code: promoCode || null,
    paid_at: status === "paid" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("payments").upsert(row, {
    onConflict: "omise_charge_id",
  });

  if (error) {
    if (isMissingPaymentsTable(error)) {
      console.warn("payments table missing — run docs/sql/016_payments.sql");
      return { skipped: true, status };
    }
    throw new Error(error.message || "Failed to save payment.");
  }

  return { skipped: false, status };
}

/**
 * Prefer service role (webhook). Fall back to the signed-in user's client when
 * the payer matches charge metadata (local poll without service role).
 */
async function resolveFulfillmentClient(chargeUserId, sessionUser) {
  const service = createServiceClient();
  if (service) {
    return { client: service, via: "service" };
  }

  if (sessionUser?.id && sessionUser.id === chargeUserId) {
    const sessionClient = await createClient();
    return { client: sessionClient, via: "session" };
  }

  throw new Error(
    "Enrollment is unavailable. Set SUPABASE_SERVICE_ROLE_KEY in .env.local (required for QR enrollment / webhooks).",
  );
}

export async function fulfillPaidCharge(
  charge,
  fallbackMethod = "qr",
  { sessionUser = null } = {},
) {
  const userId = String(charge?.metadata?.userId ?? "").trim();
  const courseId = String(charge?.metadata?.courseId ?? "").trim();
  const promoCode = String(charge?.metadata?.promoCode ?? "").trim();

  if (!userId || !courseId) {
    return { ignored: true };
  }

  const { client } = await resolveFulfillmentClient(userId, sessionUser);

  const amount = Number(charge.amount) / 100;
  await upsertPaymentRecord(client, {
    userId,
    courseId,
    charge,
    method: paymentMethodFromCharge(charge, fallbackMethod),
    amount: Number.isFinite(amount) ? amount : 0,
    promoCode,
  });

  if (!isOmiseChargePaid(charge)) {
    return { pending: true, enrolled: false, paid: false };
  }

  const enrollment = await enrollPaidUser(userId, courseId, client);
  return {
    ignored: false,
    pending: false,
    paid: true,
    enrolled: true,
    already: enrollment.already,
  };
}
