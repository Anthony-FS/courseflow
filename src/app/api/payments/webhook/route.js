import { jsonError, jsonOk } from "@/lib/api";
import { fulfillPaidCharge } from "@/lib/payments";
import { isOmiseChargePaid, retrieveOmiseEvent } from "@/lib/omise-server";

const CHARGE_EVENT_KEYS = new Set([
  "charge.complete",
  "charge.create",
]);

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const eventId = String(payload?.id ?? "").trim();
  if (!eventId || payload?.object !== "event") {
    return jsonOk({ received: true, ignored: true });
  }

  let event;
  try {
    event = await retrieveOmiseEvent(eventId);
  } catch (error) {
    return jsonError(error.message || "Failed to verify Omise event.", error.status || 400);
  }

  if (!CHARGE_EVENT_KEYS.has(event.key)) {
    return jsonOk({ received: true, ignored: true, key: event.key });
  }

  const charge = event.data;
  if (charge?.object !== "charge") {
    return jsonOk({ received: true, ignored: true });
  }

  try {
    const result = await fulfillPaidCharge(charge, "qr");

    if (result.ignored) {
      return jsonOk({ received: true, ignored: true });
    }

    if (result.pending || !isOmiseChargePaid(charge)) {
      return jsonOk({ received: true, pending: true, chargeId: charge.id });
    }

    return jsonOk({
      received: true,
      chargeId: charge.id,
      paid: true,
      enrolled: result.enrolled,
      already: result.already,
    });
  } catch (error) {
    return jsonError(error.message || "Failed to process payment webhook.", 500);
  }
}
