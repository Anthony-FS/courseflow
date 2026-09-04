import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import { buildRecoveryRedirectUrl } from "@/lib/auth-recovery";
import {
  AUTH_FORGOT_PASSWORD_RATE_LIMIT,
  AUTH_FORGOT_PASSWORD_RATE_WINDOW_MS,
  authForgotPasswordRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_FORGOT_PASSWORD_IP_RATE_LIMIT = 10;
const AUTH_FORGOT_PASSWORD_IP_RATE_WINDOW_MS = 60_000;
const MAX_USER_LOOKUP_PAGES = 20;

function authForgotPasswordIpRateLimitKey(ip) {
  return `auth-forgot-password-ip:${ip || "unknown"}`;
}

function resolveRedirectTo(request, bodyRedirectTo) {
  if (typeof bodyRedirectTo === "string" && bodyRedirectTo.trim()) {
    try {
      const url = new URL(bodyRedirectTo);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.toString();
      }
    } catch {
      // Fall through to Origin-based default.
    }
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return buildRecoveryRedirectUrl(origin);
    } catch {
      // Fall through.
    }
  }

  return null;
}

function createPublishableAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function readRetryAfterSeconds(message, fallback = 60) {
  const match = String(message ?? "").match(/after\s+(\d+)\s+seconds?/i);
  if (!match) return fallback;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
}

async function registeredEmailExists(supabase, email) {
  const normalized = email.trim().toLowerCase();

  for (let page = 1; page <= MAX_USER_LOOKUP_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      return { exists: false, error };
    }

    const users = data?.users ?? [];
    const found = users.some(
      (user) => String(user.email ?? "").trim().toLowerCase() === normalized,
    );

    if (found) {
      return { exists: true, error: null };
    }

    if (users.length < 200) {
      return { exists: false, error: null };
    }
  }

  return { exists: false, error: null };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid JSON body", 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return jsonError("Please enter a valid email.", 400);
  }

  const clientIp = getClientIp(request);
  const ipLimited = checkRateLimit(authForgotPasswordIpRateLimitKey(clientIp), {
    limit: AUTH_FORGOT_PASSWORD_IP_RATE_LIMIT,
    windowMs: AUTH_FORGOT_PASSWORD_IP_RATE_WINDOW_MS,
  });
  if (!ipLimited.allowed) {
    return jsonTooManyRequests(
      ipLimited.retryAfterSec,
      "Too many reset requests. Please try again shortly.",
    );
  }

  const redirectTo = resolveRedirectTo(request, body.redirectTo);
  if (!redirectTo) {
    return jsonError("Unable to determine password reset redirect URL.", 400);
  }

  const service = createServiceClient();
  if (!service) {
    return jsonError("Password reset is not configured.", 500);
  }

  const lookup = await registeredEmailExists(service, email);
  if (lookup.error) {
    return jsonError(
      lookup.error.message || "Unable to send reset email. Please try again.",
      400,
    );
  }

  if (!lookup.exists) {
    return jsonError(
      "No account found with this email. Please check and try again.",
      404,
    );
  }

  const emailLimitKey = authForgotPasswordRateLimitKey(clientIp, email);
  const limited = checkRateLimit(emailLimitKey, {
    limit: AUTH_FORGOT_PASSWORD_RATE_LIMIT,
    windowMs: AUTH_FORGOT_PASSWORD_RATE_WINDOW_MS,
    dryRun: true,
  });
  if (!limited.allowed) {
    return jsonTooManyRequests(
      limited.retryAfterSec,
      "Please wait before requesting another reset link.",
    );
  }

  const authClient = createPublishableAuthClient() ?? service;
  const { error: sendError } = await authClient.auth.resetPasswordForEmail(
    email,
    { redirectTo },
  );

  if (sendError) {
    const status = Number(sendError.status) || 400;
    if (status === 429) {
      const retryAfterSec = readRetryAfterSeconds(sendError.message, 60);
      return jsonTooManyRequests(
        retryAfterSec,
        sendError.message || "Please wait before requesting another reset link.",
      );
    }

    return jsonError(
      sendError.message || "Unable to send reset email. Please try again.",
      status >= 400 && status < 600 ? status : 400,
    );
  }

  checkRateLimit(emailLimitKey, {
    limit: AUTH_FORGOT_PASSWORD_RATE_LIMIT,
    windowMs: AUTH_FORGOT_PASSWORD_RATE_WINDOW_MS,
  });

  return jsonOk({
    ok: true,
    email,
    cooldownSec: Math.floor(AUTH_FORGOT_PASSWORD_RATE_WINDOW_MS / 1000),
  });
}
