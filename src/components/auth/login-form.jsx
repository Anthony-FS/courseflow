"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

function validatePassword(password) {
  if (!password) {
    return "Please enter your password.";
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

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleEmailChange(event) {
    const value = event.target.value;
    setEmail(value);
    if (submitted) {
      setEmailError(validateEmail(value));
    }
  }

  function handlePasswordChange(event) {
    const value = event.target.value;
    setPassword(value);
    if (submitted) {
      setPasswordError(validatePassword(value));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const message = "Email or password is incorrect.";
        setEmailError(message);
        setPasswordError(message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      const message = "Login failed. Please try again.";
      setEmailError(message);
      setPasswordError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailInvalid = Boolean(emailError);
  const passwordInvalid = Boolean(passwordError);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit min-h-[446px] w-[453px] max-w-full flex-col"
      noValidate
    >
      <h1 className="h-[45px] w-[453px] max-w-full text-[36px] leading-[125%] font-medium tracking-[-0.02em] text-[#22269E]">
        Welcome back!
      </h1>

      <div className="mt-10 flex flex-1 flex-col gap-10">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="h-6 w-[453px] max-w-full text-[16px] leading-[150%] font-normal tracking-normal text-gray-900"
          >
            Email
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter Email"
              value={email}
              onChange={handleEmailChange}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? "email-errors" : undefined}
              className={cn(
                "ds-input h-12 rounded-[8px] border-gray-300 bg-white px-4 text-body2 placeholder:text-gray-600",
                emailInvalid &&
                  "border-[#9B2FAC] pr-12 focus:border-[#9B2FAC] focus:shadow-none"
              )}
            />
            {emailInvalid ? <FieldErrorIcon /> : null}
          </div>
          <FieldError id="email-errors" message={emailError} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="h-6 w-[453px] max-w-full text-[16px] leading-[150%] font-normal tracking-normal text-gray-900"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={handlePasswordChange}
              aria-invalid={passwordInvalid}
              aria-describedby={passwordInvalid ? "password-errors" : undefined}
              className={cn(
                "ds-input h-12 rounded-[8px] border-gray-300 bg-white px-4 text-body2 placeholder:text-gray-600",
                passwordInvalid &&
                  "border-[#9B2FAC] pr-12 focus:border-[#9B2FAC] focus:shadow-none"
              )}
            />
            {passwordInvalid ? <FieldErrorIcon /> : null}
          </div>
          <FieldError id="password-errors" message={passwordError} />
        </div>

        <Button type="submit" className="w-full rounded-[12px]" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </Button>
      </div>

      <p className="mt-6 text-body2 text-gray-900">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-blue-500 hover:text-blue-400"
        >
          Register
        </Link>
      </p>
      <p className="mt-2 text-body2">
        <Link
          href="/forgot-password"
          className="font-bold text-blue-500 hover:text-blue-400"
        >
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
