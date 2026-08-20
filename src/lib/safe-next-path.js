export function safeNextPath(value, fallback = "/") {
  const path = String(value ?? "").trim();

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }

  return path;
}
