import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { fulfillPaidCharge } from "@/lib/payments";
import { isOmiseChargePaid, retrieveOmiseCharge } from "@/lib/omise-server";

export async function GET(_request, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;

  const chargeId = String((await params).id ?? "").trim();
  if (!chargeId) {
    return jsonError("Charge id is required.", 400);
  }

  try {
    const charge = await retrieveOmiseCharge(chargeId);
    const paid = isOmiseChargePaid(charge);

    const metadataUserId = String(charge?.metadata?.userId ?? "").trim();
    if (metadataUserId && metadataUserId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    if (!paid) {
      return jsonOk({
        chargeId: charge.id,
        status: charge.status,
        paid: false,
        enrolled: false,
        already: false,
      });
    }

    const result = await fulfillPaidCharge(charge, "qr", { sessionUser: user });

    if (result.ignored) {
      return jsonError("Payment metadata is incomplete. Cannot enroll.", 400);
    }

    if (!result.enrolled) {
      return jsonError(
        "Payment received but enrollment is not complete yet. Try Refresh status.",
        409,
        {
          chargeId: charge.id,
          status: charge.status,
          paid: true,
          enrolled: false,
        },
      );
    }

    return jsonOk({
      chargeId: charge.id,
      status: charge.status,
      paid: true,
      enrolled: true,
      already: Boolean(result.already),
    });
  } catch (err) {
    return jsonError(err.message || "Failed to load charge.", err.status || 500);
  }
}
