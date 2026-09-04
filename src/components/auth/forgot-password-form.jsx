"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildRecoveryRedirectUrl } from "@/lib/auth-recovery";
import { cn } from "@/lib/utils";

const COOLDOWN_SEC = 60;
const COOLDOWN_STORAGE_PREFIX = "forgot-password-cooldown:";

function buildSuccessMessage(email) {
  return `We've sent a password reset link to ${email}. Click the link in the email to set a new password.`;
}

function validateEmail(email) {
  const value = email.trim();

  if (!value) {
    return "Please enter your email.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Please enter a valid email.";
  }

  return "";
}

function cooldownStorageKey(email) {
  return `${COOLDOWN_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readRemainingCooldown(email) {
  if (typeof window === "undefined" || !email.trim()) {
    return 0;
  }

  try {
    const raw = sessionStorage.getItem(cooldownStorageKey(email));
    if (!raw) return 0;
    const endsAt = Number(raw);
    if (!Number.isFinite(endsAt)) return 0;
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function persistCooldown(email, seconds = COOLDOWN_SEC) {
  try {
    sessionStorage.setItem(
      cooldownStorageKey(email),
      String(Date.now() + seconds * 1000),
    );
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

function FieldErrorIcon() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-3 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-[#9B2FAC] text-[11px] leading-none font-bold text-white"
    >
      !
    </span>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p id={id} className="mt-1 text-body3 text-[#9B2FAC]">
      {message}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setCooldown(readRemainingCooldown(email));
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1) return 0;
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldown]);

  function handleEmailChange(event) {
    const value = event.target.value;
    setEmail(value);
    setFormError("");
    setSuccessMessage("");
    if (submitted) {
      setEmailError(validateEmail(value));
    }
  }

  function startCooldown(seconds = COOLDOWN_SEC) {
    const next = Math.max(1, Number(seconds) || COOLDOWN_SEC);
    persistCooldown(email, next);
    setCooldown(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormError("");
    setSuccessMessage("");

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) {
      return;
    }

    const remaining = readRemainingCooldown(email);
    if (remaining > 0) {
      setCooldown(remaining);
      setFormError(`Please wait ${remaining}s before requesting another reset link.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          redirectTo: buildRecoveryRedirectUrl(window.location.origin),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After")) || COOLDOWN_SEC;
        startCooldown(retryAfter);
        setFormError(
          data?.error || "Please wait before requesting another reset link.",
        );
        return;
      }

      if (!response.ok) {
        setFormError(
          data?.error || "Unable to send reset email. Please try again.",
        );
        return;
      }

      const cooldownSec = Number(data?.cooldownSec) || COOLDOWN_SEC;
      startCooldown(cooldownSec);
      setSuccessMessage(buildSuccessMessage(data?.email || trimmedEmail));
    } catch {
      setFormError("Unable to send reset email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailInvalid = Boolean(emailError);
  const submitDisabled = isSubmitting || cooldown > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit min-h-[320px] w-[453px] max-w-full flex-col"
      noValidate
    >
      <h1 className="h-auto w-[453px] max-w-full text-[36px] leading-[125%] font-medium tracking-[-0.02em] text-[#22269E]">
        Forgot password?
      </h1>
      <p className="mt-3 text-body2 text-gray-700">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="mt-10 flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="forgot-email"
            className="h-6 w-[453px] max-w-full text-[16px] leading-[150%] font-normal tracking-normal text-gray-900"
          >
            Email
          </label>
          <div className="relative">
            <input
              id="forgot-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter Email"
              value={email}
              onChange={handleEmailChange}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? "forgot-email-errors" : undefined}
              className={cn(
                "ds-input h-12 rounded-[8px] border-gray-300 bg-white px-4 text-body2 placeholder:text-gray-600",
                emailInvalid &&
                  "border-[#9B2FAC] pr-12 focus:border-[#9B2FAC] focus:shadow-none",
              )}
            />
            {emailInvalid ? <FieldErrorIcon /> : null}
          </div>
          <FieldError id="forgot-email-errors" message={emailError} />
        </div>

        {formError ? (
          <p className="text-body3 text-[#9B2FAC]" role="alert">
            {formError}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className="rounded-[8px] border border-green-200 bg-green-50 px-3 py-2 text-body3 text-green-800"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full rounded-[12px]" disabled={submitDisabled}>
          {isSubmitting
            ? "Sending..."
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Send reset link"}
        </Button>
      </div>

      <p className="mt-6 text-body2 text-gray-900">
        Remember your password?{" "}
        <Link href="/login" className="font-bold text-blue-500 hover:text-blue-400">
          Log in
        </Link>
      </p>
    </form>
  );
}
