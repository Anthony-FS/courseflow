const OMISE_API = "https://api.omise.co";

function getSecretKey() {
  const secret = process.env.OMISE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing OMISE_SECRET_KEY.");
  }
  return secret;
}

function authHeader() {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString("base64")}`;
}

export async function omiseRequest(path, { method = "GET", body } = {}) {
  const headers = {
    Authorization: authHeader(),
  };

  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(`${OMISE_API}${path}`, {
    method,
    headers,
    body: body ? new URLSearchParams(body).toString() : undefined,
    cache: "no-store",
  });

  const data = await response.json();
  if (data?.object === "error") {
    const error = new Error(data.message || "Omise request failed.");
    error.status = data.code === "not_found" ? 404 : 400;
    throw error;
  }

  return data;
}

export async function createOmiseCharge({
  amountSatang,
  cardToken,
  sourceId,
  metadata = {},
}) {
  const body = {
    amount: String(amountSatang),
    currency: "thb",
    description: metadata.description || "CourseFlow checkout",
    "metadata[courseId]": metadata.courseId || "",
    "metadata[userId]": metadata.userId || "",
    "metadata[promoCode]": metadata.promoCode || "",
  };

  if (cardToken) {
    body.card = cardToken;
  } else if (sourceId) {
    body.source = sourceId;
  } else {
    body["source[type]"] = "promptpay";
  }

  return omiseRequest("/charges", { method: "POST", body });
}

export async function retrieveOmiseCharge(chargeId) {
  return omiseRequest(`/charges/${encodeURIComponent(chargeId)}`);
}

export async function retrieveOmiseEvent(eventId) {
  return omiseRequest(`/events/${encodeURIComponent(eventId)}`);
}

export function isOmiseChargePaid(charge) {
  return Boolean(charge?.paid) || charge?.status === "successful";
}

export function getPromptPayQrUri(charge) {
  return charge?.source?.scannable_code?.image?.download_uri || null;
}

export async function fetchQrDataUrl(downloadUri) {
  if (!downloadUri) return null;

  const response = await fetch(downloadUri, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  if (!response.ok) {
    return downloadUri;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
