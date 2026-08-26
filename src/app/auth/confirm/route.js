import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function safeNextPath(next) {
  if (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
  ) {
    return next;
  }
  return "/reset-password";
}

function redirectWithError(origin, description) {
  const url = new URL("/reset-password", origin);
  url.searchParams.set("error", "access_denied");
  url.searchParams.set(
    "error_description",
    description || "Email link is invalid or has expired",
  );
  return NextResponse.redirect(url);
}

/**
 * Handles Supabase email links (password recovery, etc.).
 * Supports PKCE `code` and `token_hash` + `type` (verifyOtp).
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

  if (tokenHash && type) {
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

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (!exchangeError) {
    return successRedirect;
  }

  return redirectWithError(
    origin,
    exchangeError.message || "Email link is invalid or has expired",
  );
}
