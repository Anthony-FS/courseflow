export function jsonOk(data, init = {}) {
  const { status = 200, headers, ...rest } = init;
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  });
}

export function jsonError(message, status = 400, extras = {}, init = {}) {
  const { headers, ...rest } = init;
  return Response.json(
    {
      error: message,
      ...extras,
    },
    { status, headers, ...rest },
  );
}

export function jsonTooManyRequests(
  retryAfterSec,
  message = "Too many searches, try again in a moment",
) {
  const seconds = Math.max(1, Number(retryAfterSec) || 1);
  return jsonError(message, 429, {}, {
    headers: { "Retry-After": String(seconds) },
  });
}
