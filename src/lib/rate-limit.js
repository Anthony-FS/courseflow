/**
 * In-memory sliding-window limiter.
 * Works for a single `next start` process. Does not share state across
 * serverless replicas — enough for this project; do not add Redis here.
 */

const buckets = new Map();

export const CATALOG_RATE_LIMIT = 60;
export const CATALOG_RATE_WINDOW_MS = 60_000;
export const ADMIN_SEARCH_RATE_LIMIT = 120;
export const ADMIN_SEARCH_RATE_WINDOW_MS = 60_000;
export const AUTH_REGISTER_RATE_LIMIT = 5;
export const AUTH_REGISTER_RATE_WINDOW_MS = 15 * 60_000;
export const ADMIN_ASSIGNMENT_CREATE_RATE_LIMIT = 20;
export const ADMIN_ASSIGNMENT_CREATE_RATE_WINDOW_MS = 15 * 60_000;

export function getClientIp(request) {
  const forwarded = request?.headers?.get?.("x-forwarded-for");
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    if (first) {
      return first;
    }
  }

  const realIp = request?.headers?.get?.("x-real-ip");
  if (realIp) {
    const trimmed = String(realIp).trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "unknown";
}

export function catalogRateLimitKey(ip) {
  return `catalog:${ip || "unknown"}`;
}

export function adminSearchRateLimitKey(ip) {
  return `admin-search:${ip || "unknown"}`;
}

export function authRegisterRateLimitKey(ip) {
  return `auth-register:${ip || "unknown"}`;
}

export function adminAssignmentCreateRateLimitKey(adminId) {
  return `admin-assignment-create:${adminId || "unknown"}`;
}

export function checkRateLimit(
  key,
  { limit, windowMs, now = Date.now() } = {},
) {
  const max = Number(limit);
  const window = Number(windowMs);

  if (!key || !Number.isInteger(max) || max < 1 || !Number.isInteger(window) || window < 1) {
    return { allowed: true, retryAfterSec: 0 };
  }

  let timestamps = buckets.get(key) ?? [];

  const cutoff = now - window;
  timestamps = timestamps.filter((stamp) => stamp > cutoff);

  if (timestamps.length >= max) {
    buckets.set(key, timestamps);
    const retryAfterMs = timestamps[0] + window - now;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimitStore() {
  buckets.clear();
}
