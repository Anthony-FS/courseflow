"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const SUCCESS_MESSAGE =
  "If an account exists for this email, you will receive a password reset link shortly.";

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

  function handleEmailChange(event) {
    const value = event.target.value;
    setEmail(value);
    setFormError("");
    setSuccessMessage("");
    if (submitted) {
      setEmailError(validateEmail(value));
    }
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

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setFormError("Unable to send reset email. Please try again.");
        return;
      }

      // Same message whether or not the account exists (anti-enumeration).
      setSuccessMessage(SUCCESS_MESSAGE);
    } catch {
      setFormError("Unable to send reset email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailInvalid = Boolean(emailError);

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
          <p className="text-body3 text-gray-700" aria-live="polite">
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full rounded-[12px]" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
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
