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

export function jsonError(message, status = 400, extras = {}) {
  return Response.json(
    {
      error: message,
      ...extras,
    },
    { status },
  );
}
