import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import { registerGuest } from "@/lib/register-guest";
import {
  AUTH_REGISTER_RATE_LIMIT,
  AUTH_REGISTER_RATE_WINDOW_MS,
  authRegisterRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

function readRegisterValues(body) {
  return {
    fullName: String(body.fullName ?? ""),
    dob: String(body.dob ?? ""),
    education: String(body.education ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    confirmPassword: String(body.confirmPassword ?? ""),
  };
}

export async function POST(request) {
  const limited = checkRateLimit(authRegisterRateLimitKey(getClientIp(request)), {
    limit: AUTH_REGISTER_RATE_LIMIT,
    windowMs: AUTH_REGISTER_RATE_WINDOW_MS,
  });
  if (!limited.allowed) {
    return jsonTooManyRequests(
      limited.retryAfterSec,
      "Too many registration attempts, try again in a moment",
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid JSON body", 400);
  }

  const supabase = await createClient();
  const result = await registerGuest(supabase, readRegisterValues(body));

  if (result.errors) {
    return jsonError("Please check the required registration fields", 400, {
      errors: result.errors,
    });
  }

  if (result.error) {
    return jsonError(result.error, 400);
  }

  return jsonOk({ ok: true });
}
