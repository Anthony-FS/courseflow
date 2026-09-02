"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  clearRecoveryUrlParams,
  completeClientRecoverySession,
  hasRecoveryLinkParams,
  readRecoveryLinkError,
} from "@/lib/auth-recovery";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DEFAULT_RECOVERY_ERROR =
  "This reset link is invalid or has expired. Please request a new one.";

function validatePassword(password) {
  if (!password) {
    return "Please enter a password.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return "";
}

function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (confirmPassword !== password) {
    return "Passwords do not match.";
  }
  return "";
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

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoveryQuery = searchParams.toString();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const linkError = readRecoveryLinkError(searchParams);

    if (linkError && !hasRecoveryLinkParams(searchParams)) {
      setSessionError(linkError);
      setSessionChecking(false);
      return undefined;
    }

    const supabase = createClient();

    async function finishRecovery(errorMessage = "") {
      if (cancelled) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session) {
        setSessionReady(true);
        setSessionError("");
        setSessionChecking(false);
        clearRecoveryUrlParams();
        return;
      }

      setSessionError(errorMessage || DEFAULT_RECOVERY_ERROR);
      setSessionChecking(false);
    }

    async function establishRecoverySession() {
      const recoveryResult = await completeClientRecoverySession(
        supabase,
        searchParams,
      );

      if (cancelled) return;

      if (recoveryResult.ok) {
        await finishRecovery();
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session) {
        await finishRecovery();
        return;
      }

      // detectSessionInUrl may still be exchanging the code.
      window.setTimeout(async () => {
        if (cancelled) return;

        const retryResult = await completeClientRecoverySession(
          supabase,
          searchParams,
        );

        if (cancelled) return;

        if (retryResult.ok) {
          await finishRecovery();
          return;
        }

        await finishRecovery(
          retryResult.error || recoveryResult.error || linkError,
        );
      }, 800);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setSessionReady(true);
        setSessionError("");
        setSessionChecking(false);
        clearRecoveryUrlParams();
      }
    });

    establishRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [recoveryQuery]);

  function handlePasswordChange(event) {
    const value = event.target.value;
    setPassword(value);
    setFormError("");
    if (submitted) {
      setPasswordError(validatePassword(value));
      setConfirmError(validateConfirmPassword(value, confirmPassword));
    }
  }

  function handleConfirmChange(event) {
    const value = event.target.value;
    setConfirmPassword(value);
    setFormError("");
    if (submitted) {
      setConfirmError(validateConfirmPassword(password, value));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormError("");

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validateConfirmPassword(password, confirmPassword);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);

    if (nextPasswordError || nextConfirmError) {
      return;
    }

    if (!sessionReady) {
      setFormError(DEFAULT_RECOVERY_ERROR);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(
          error.message || "Unable to update password. Please try again.",
        );
        return;
      }

      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setFormError("Unable to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordInvalid = Boolean(passwordError);
  const confirmInvalid = Boolean(confirmError);

  if (sessionChecking) {
    return (
      <div className="flex h-fit min-h-[200px] w-[453px] max-w-full flex-col">
        <h1 className="text-[36px] leading-[125%] font-medium tracking-[-0.02em] text-[#22269E]">
          Reset password
        </h1>
        <p className="mt-6 text-body2 text-gray-700">Checking reset link…</p>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex h-fit min-h-[200px] w-[453px] max-w-full flex-col">
        <h1 className="text-[36px] leading-[125%] font-medium tracking-[-0.02em] text-[#22269E]">
          Reset password
        </h1>
        <p className="mt-6 text-body2 text-[#9B2FAC]" role="alert">
          {sessionError || DEFAULT_RECOVERY_ERROR}
        </p>
        <p className="mt-6 text-body2 text-gray-900">
          <Link
            href="/forgot-password"
            className="font-bold text-blue-500 hover:text-blue-400"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit min-h-[360px] w-[453px] max-w-full flex-col"
      noValidate
    >
      <h1 className="text-[36px] leading-[125%] font-medium tracking-[-0.02em] text-[#22269E]">
        Reset password
      </h1>
      <p className="mt-3 text-body2 text-gray-700">
        Choose a new password for your account.
      </p>

      <div className="mt-10 flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="new-password"
            className="h-6 text-[16px] leading-[150%] font-normal text-gray-900"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Enter new password"
              value={password}
              onChange={handlePasswordChange}
              aria-invalid={passwordInvalid}
              aria-describedby={
                passwordInvalid ? "new-password-errors" : undefined
              }
              className={cn(
                "ds-input h-12 rounded-[8px] border-gray-300 bg-white px-4 text-body2 placeholder:text-gray-600",
                passwordInvalid &&
                  "border-[#9B2FAC] pr-12 focus:border-[#9B2FAC] focus:shadow-none",
              )}
            />
            {passwordInvalid ? <FieldErrorIcon /> : null}
          </div>
          <FieldError id="new-password-errors" message={passwordError} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="confirm-password"
            className="h-6 text-[16px] leading-[150%] font-normal text-gray-900"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={handleConfirmChange}
              aria-invalid={confirmInvalid}
              aria-describedby={
                confirmInvalid ? "confirm-password-errors" : undefined
              }
              className={cn(
                "ds-input h-12 rounded-[8px] border-gray-300 bg-white px-4 text-body2 placeholder:text-gray-600",
                confirmInvalid &&
                  "border-[#9B2FAC] pr-12 focus:border-[#9B2FAC] focus:shadow-none",
              )}
            />
            {confirmInvalid ? <FieldErrorIcon /> : null}
          </div>
          <FieldError id="confirm-password-errors" message={confirmError} />
        </div>

        {formError ? (
          <p className="text-body3 text-[#9B2FAC]" role="alert">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full rounded-[12px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Update password"}
        </Button>
      </div>

      <p className="mt-6 text-body2 text-gray-900">
        <Link href="/login" className="font-bold text-blue-500 hover:text-blue-400">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
