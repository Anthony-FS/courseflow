import { jsonError, jsonOk } from "@/lib/api";
import { fulfillPaidCharge } from "@/lib/payments";
import { isOmiseChargePaid, retrieveOmiseCharge } from "@/lib/omise-server";

export async function GET(_request, { params }) {
  const chargeId = String((await params).id ?? "").trim();
  if (!chargeId) {
    return jsonError("Charge id is required.", 400);
  }

  try {
    const charge = await retrieveOmiseCharge(chargeId);
    const paid = isOmiseChargePaid(charge);
    let enrolled = false;
    let already = false;

    if (paid) {
      const result = await fulfillPaidCharge(charge, "qr");
      enrolled = Boolean(result.enrolled);
      already = Boolean(result.already);
    }

    return jsonOk({
      chargeId: charge.id,
      status: charge.status,
      paid,
      enrolled,
      already,
    });
  } catch (error) {
    return jsonError(error.message || "Failed to load charge.", error.status || 400);
  }
}
