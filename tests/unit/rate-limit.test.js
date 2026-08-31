import { beforeEach, describe, expect, it } from "vitest";

import { jsonError, jsonTooManyRequests } from "@/lib/api";
import {
  CATALOG_RATE_LIMIT,
  CATALOG_RATE_WINDOW_MS,
  ADMIN_SEARCH_RATE_LIMIT,
  ADMIN_SEARCH_RATE_WINDOW_MS,
  catalogRateLimitKey,
  adminSearchRateLimitKey,
  checkRateLimit,
  getClientIp,
  resetRateLimitStore,
} from "@/lib/rate-limit";

describe("jsonTooManyRequests", () => {
  it("returns 429 with Retry-After and keeps extras out of the body", async () => {
    const response = jsonTooManyRequests(12);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect(body).toEqual({
      error: "Too many searches, try again in a moment",
    });
  });

  it("still puts extras on jsonError bodies", async () => {
    const response = jsonError("Nope", 400, { fields: { q: "bad" } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Nope", fields: { q: "bad" } });
  });
});

describe("getClientIp", () => {
  it("uses the first x-forwarded-for address", () => {
    const request = new Request("http://localhost/api/courses", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip then unknown", () => {
    const realIp = new Request("http://localhost/api/courses", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(realIp)).toBe("9.9.9.9");
    expect(getClientIp(new Request("http://localhost/api/courses"))).toBe(
      "unknown",
    );
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows up to the limit then rejects with retryAfterSec", () => {
    const key = "catalog:1.1.1.1";
    const options = { limit: 2, windowMs: 60_000, now: 1_000 };

    expect(checkRateLimit(key, options)).toEqual({
      allowed: true,
      retryAfterSec: 0,
    });
    expect(checkRateLimit(key, { ...options, now: 1_100 })).toEqual({
      allowed: true,
      retryAfterSec: 0,
    });
    expect(checkRateLimit(key, { ...options, now: 1_200 })).toEqual({
      allowed: false,
      retryAfterSec: 60,
    });
  });

  it("allows again after the window expires", () => {
    const key = "catalog:2.2.2.2";
    checkRateLimit(key, { limit: 1, windowMs: 1_000, now: 5_000 });

    expect(
      checkRateLimit(key, { limit: 1, windowMs: 1_000, now: 5_500 }),
    ).toEqual({ allowed: false, retryAfterSec: 1 });
    expect(
      checkRateLimit(key, { limit: 1, windowMs: 1_000, now: 6_001 }),
    ).toEqual({ allowed: true, retryAfterSec: 0 });
  });

  it("keeps separate keys independent", () => {
    const options = { limit: 1, windowMs: 60_000, now: 10_000 };

    expect(checkRateLimit("catalog:a", options).allowed).toBe(true);
    expect(checkRateLimit("catalog:b", options).allowed).toBe(true);
    expect(checkRateLimit("catalog:a", options).allowed).toBe(false);
    expect(checkRateLimit("catalog:b", options).allowed).toBe(false);
  });

  it("uses the catalog key prefix and default window", () => {
    expect(catalogRateLimitKey("8.8.8.8")).toBe("catalog:8.8.8.8");
    expect(CATALOG_RATE_LIMIT).toBe(60);
    expect(CATALOG_RATE_WINDOW_MS).toBe(60_000);
  });

  it("uses a looser admin search key and window", () => {
    expect(adminSearchRateLimitKey("8.8.8.8")).toBe("admin-search:8.8.8.8");
    expect(ADMIN_SEARCH_RATE_LIMIT).toBe(120);
    expect(ADMIN_SEARCH_RATE_WINDOW_MS).toBe(60_000);
  });
});
