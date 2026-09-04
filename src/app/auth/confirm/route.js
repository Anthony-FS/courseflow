import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import {
  RECOVERY_RESET_PATH,
} from "@/lib/auth-recovery";

function safeNextPath(next) {
  if (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
  ) {
    return next;
  }
  return RECOVERY_RESET_PATH;
}

function redirectWithError(origin, description) {
  const url = new URL(RECOVERY_RESET_PATH, origin);
  url.searchParams.set("error", "access_denied");
  url.searchParams.set(
    "error_description",
    description || "Email link is invalid or has expired",
  );
  return NextResponse.redirect(url);
}

function redirectToClientRecovery(origin, code, next) {
  const url = new URL(next, origin);
  url.searchParams.set("code", code);
  return NextResponse.redirect(url);
}

/**
 * Handles Supabase email links (password recovery, etc.).
 * token_hash links are verified on the server.
 * PKCE `code` links are forwarded to the reset page for client-side exchange
 * (the browser holds the PKCE verifier cookie from forgot-password).
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return redirectWithError(
      origin,
      errorDescription?.replace(/\+/g, " ") || error,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return redirectWithError(origin, "Auth is not configured.");
  }

  if (!code && !(tokenHash && type)) {
    return redirectWithError(
      origin,
      "Email link is invalid or has expired",
    );
  }

  // PKCE recovery: exchange in the browser where the verifier cookie lives.
  if (code && !(tokenHash && type)) {
    return redirectToClientRecovery(origin, code, next);
  }

  let successRedirect = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successRedirect.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error: otpError } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (!otpError) {
    return successRedirect;
  }

  return redirectWithError(
    origin,
    otpError.message || "Email link is invalid or has expired",
  );
}
