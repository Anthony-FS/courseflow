export const RECOVERY_CONFIRM_PATH = "/auth/confirm";
export const RECOVERY_RESET_PATH = "/reset-password";

export function buildRecoveryRedirectUrl(origin) {
  return new URL(RECOVERY_RESET_PATH, origin).toString();
}

export function buildRecoveryConfirmUrl(origin) {
  const url = new URL(RECOVERY_CONFIRM_PATH, origin);
  url.searchParams.set("next", RECOVERY_RESET_PATH);
  return url.toString();
}

export function isPkceVerifierError(message) {
  return String(message ?? "")
    .toLowerCase()
    .includes("pkce code verifier");
}

export function hasRecoveryLinkParams(searchParams) {
  return Boolean(
    searchParams.get("code") ||
      (searchParams.get("token_hash") && searchParams.get("type")),
  );
}

export function readRecoveryLinkError(searchParams) {
  const error = searchParams.get("error");
  if (!error) return "";

  const description = (searchParams.get("error_description") || "")
    .replace(/\+/g, " ")
    .trim();

  if (description) {
    return formatRecoveryErrorMessage(description);
  }

  return "This reset link is invalid or has expired. Please request a new one.";
}

export function formatRecoveryErrorMessage(message) {
  if (isPkceVerifierError(message)) {
    return "Open the reset link in the same browser where you requested it, or request a new link and try again.";
  }

  return message;
}

function readHashRecoveryParams() {
  if (typeof window === "undefined") {
    return { accessToken: "", refreshToken: "", type: "" };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);

  return {
    accessToken: params.get("access_token") ?? "",
    refreshToken: params.get("refresh_token") ?? "",
    type: params.get("type") ?? "",
  };
}

export function clearRecoveryUrlParams() {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(window.history.state, "", RECOVERY_RESET_PATH);
}

/**
 * Completes a password-recovery link on the client (PKCE code, token_hash, or hash tokens).
 */
export async function completeClientRecoverySession(supabase, searchParams) {
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const { accessToken, refreshToken, type: hashType } = readHashRecoveryParams();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return { ok: true };
    }

    return { ok: false, error: formatRecoveryErrorMessage(error.message) };
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return { ok: true };
    }

    return { ok: false, error: formatRecoveryErrorMessage(error.message) };
  }

  if (accessToken && refreshToken && hashType === "recovery") {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!error) {
      return { ok: true };
    }

    return { ok: false, error: formatRecoveryErrorMessage(error.message) };
  }

  return { ok: false, error: "" };
}
