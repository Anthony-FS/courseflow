"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/change-password";
import {
  hasPasswordChangeErrors,
  validatePasswordChange,
} from "@/lib/password-change-validation";
import { createClient } from "@/lib/supabase/client";

const EMPTY_VALUES = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const FIELDS = [
  {
    key: "currentPassword",
    label: "Current Password",
    placeholder: "Enter current password",
    autoComplete: "current-password",
  },
  {
    key: "newPassword",
    label: "New Password",
    placeholder: "Enter new password",
    autoComplete: "new-password",
  },
  {
    key: "confirmPassword",
    label: "Confirm New Password",
    placeholder: "Confirm new password",
    autoComplete: "new-password",
  },
];

export function ChangePasswordForm({ email }) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
    setSuccess(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validatePasswordChange(values);
    setErrors(nextErrors);
    setSubmitError("");
    setSuccess(false);

    if (hasPasswordChangeErrors(nextErrors)) return;

    setSubmitting(true);

    try {
      const supabase = createClient();
      const result = await changePassword(supabase, {
        email,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result.error) {
        if (result.field) {
          setErrors((current) => ({ ...current, [result.field]: result.error }));
        } else {
          setSubmitError(result.error);
        }
        return;
      }

      setValues(EMPTY_VALUES);
      setSuccess(true);
    } catch {
      setSubmitError("Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-113.5">
      <Link
        href="/profile"
        className="mb-8 inline-flex items-center gap-2 text-body2 font-medium text-blue-500 hover:text-blue-400"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        Back to Profile
      </Link>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        {FIELDS.map(({ key, label, placeholder, autoComplete }) => (
          <div className="flex flex-col gap-1" key={key}>
            <label className="text-body2 text-black" htmlFor={`password-${key}`}>
              {label}
            </label>
            <input
              id={`password-${key}`}
              name={key}
              type="password"
              value={values[key]}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={submitting}
              aria-invalid={errors[key] ? "true" : undefined}
              aria-describedby={errors[key] ? `password-${key}-error` : undefined}
              onChange={(event) => updateValue(key, event.target.value)}
              className="h-12 w-full rounded-lg border border-gray-400 bg-white px-3 text-body2 text-gray-900 outline-none placeholder:text-gray-500 focus:border-orange-100 focus:ring-4 focus:ring-orange-100/20 disabled:bg-gray-100 disabled:text-gray-500 aria-invalid:border-auth-error"
            />
            {errors[key] ? (
              <p id={`password-${key}-error`} className="m-0 text-body4 text-auth-error" role="alert">
                {errors[key]}
              </p>
            ) : null}
          </div>
        ))}

        <p className="-mt-2 text-body4 text-gray-600">
          Use at least 6 characters. Your new password must be different from your current password.
        </p>

        {submitError ? (
          <p className="rounded-lg bg-status-overdue px-4 py-3 text-body3 text-auth-error" role="alert">
            {submitError}
          </p>
        ) : null}

        {success ? (
          <div className="flex items-center gap-3 rounded-lg bg-green-100 px-4 py-3 text-body3 text-green-700" role="status">
            <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
            Password updated successfully.
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
