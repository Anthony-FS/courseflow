"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_VALUES = {
  fullName: "",
  dob: "",
  education: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function ageFromDob(isoDate) {
  const dob = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function validateField(name, values) {
  const value = values[name].trim();

  switch (name) {
    case "fullName":
      return value ? "" : "Please enter your name";
    case "dob": {
      if (!values.dob) {
        return "Please enter your date of birth";
      }
      const age = ageFromDob(values.dob);
      if (age == null || age < 1) {
        return "Please enter a valid date of birth";
      }
      return "";
    }
    case "education":
      return "";
    case "email":
      if (!value) {
        return "Please enter your email";
      }
      return EMAIL_PATTERN.test(value) ? "" : "Please enter a valid email";
    case "password":
      if (!values.password) {
        return "Please enter a password";
      }
      return values.password.length >= 6
        ? ""
        : "Password must be at least 6 characters";
    case "confirmPassword":
      if (!values.confirmPassword) {
        return "Please confirm your password";
      }
      return values.confirmPassword === values.password
        ? ""
        : "Passwords do not match";
    default:
      return "";
  }
}

function validateAll(values) {
  return {
    fullName: validateField("fullName", values),
    dob: validateField("dob", values),
    education: validateField("education", values),
    email: validateField("email", values),
    password: validateField("password", values),
    confirmPassword: validateField("confirmPassword", values),
  };
}

function ErrorMark() {
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-auth-error text-[11px] font-bold leading-none text-white"
    >
      !
    </span>
  );
}

function AuthField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  value,
  error,
  disabled,
  max,
  showCalendar,
  onChange,
  onBlur,
  onCalendarClick,
}) {
  const invalid = Boolean(error);

  return (
    <Field
      data-invalid={invalid || undefined}
      className="gap-1 data-[invalid=true]:text-auth-error"
    >
      <FieldLabel htmlFor={id} className="text-body3 font-medium text-gray-700">
        {label}
      </FieldLabel>
      <InputGroup
        className={cn(
          "h-12 min-h-12 rounded-lg border-gray-400 bg-white shadow-none",
          "has-[[data-slot=input-group-control]:focus-visible]:border-orange-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
          "has-[[data-slot][aria-invalid=true]]:border-auth-error has-[[data-slot][aria-invalid=true]]:ring-0",
        )}
      >
        <InputGroupInput
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          max={max}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-12 min-h-12 px-4 text-body2 text-gray-900 placeholder:text-gray-600",
            showCalendar &&
              "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          )}
          onChange={onChange}
          onBlur={onBlur}
        />
        {invalid ? (
          <InputGroupAddon align="inline-end">
            <ErrorMark />
          </InputGroupAddon>
        ) : showCalendar ? (
          <InputGroupAddon align="inline-end">
            <Calendar
              aria-hidden
              className="size-5 text-gray-600"
              onClick={onCalendarClick}
            />
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {error ? (
        <FieldError className="text-body4 font-normal text-auth-error">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const dobRef = useRef(null);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleBlur(name, value) {
    const next = { ...values, [name]: value ?? values[name] };
    setErrors((current) => ({
      ...current,
      [name]: validateField(name, next),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateAll(values);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const age = ageFromDob(values.dob);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            full_name: values.fullName.trim(),
            age,
            educational_background: values.education.trim(),
          },
        },
      });

      if (error) {
        setSubmitError(
          error.message || "Registration failed. Please try again.",
        );
        return;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }

      router.push("/login?registered=1");
    } catch {
      setSubmitError("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function openDatePicker() {
    const input = dobRef.current?.querySelector("input");
    input?.showPicker?.();
  }

  return (
    <form
      className="auth-register flex w-full max-w-113.25 flex-col gap-6"
      onSubmit={handleSubmit}
      noValidate
    >
      <h1 className="text-center text-headline3 text-blue-800">
        Register to start learning!
      </h1>

      <FieldGroup className="gap-6">
        <AuthField
          id="fullName"
          name="fullName"
          label="Name"
          placeholder="Enter Name and Lastname"
          autoComplete="name"
          value={values.fullName}
          error={errors.fullName}
          disabled={submitting}
          onChange={(event) => updateField("fullName", event.target.value)}
          onBlur={(event) => handleBlur("fullName", event.target.value)}
        />

        <div ref={dobRef}>
          <AuthField
            id="dob"
            name="dob"
            label="Date of Birth"
            type="date"
            placeholder="DD/MM/YY"
            autoComplete="bday"
            value={values.dob}
            error={errors.dob}
            disabled={submitting}
            max={todayIsoDate()}
            showCalendar
            onChange={(event) => updateField("dob", event.target.value)}
            onBlur={(event) => handleBlur("dob", event.target.value)}
            onCalendarClick={openDatePicker}
          />
        </div>

        <AuthField
          id="education"
          name="education"
          label="Educational Background"
          placeholder="Enter Educational Background"
          autoComplete="off"
          value={values.education}
          error={errors.education}
          disabled={submitting}
          onChange={(event) => updateField("education", event.target.value)}
          onBlur={(event) => handleBlur("education", event.target.value)}
        />

        <AuthField
          id="email"
          name="email"
          label="Email"
          type="email"
          placeholder="Enter Email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          disabled={submitting}
          onChange={(event) => updateField("email", event.target.value)}
          onBlur={(event) => handleBlur("email", event.target.value)}
        />

        <AuthField
          id="password"
          name="password"
          label="Password"
          type="password"
          placeholder="Enter password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          disabled={submitting}
          onChange={(event) => updateField("password", event.target.value)}
          onBlur={(event) => handleBlur("password", event.target.value)}
        />

        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          disabled={submitting}
          onChange={(event) =>
            updateField("confirmPassword", event.target.value)
          }
          onBlur={(event) => handleBlur("confirmPassword", event.target.value)}
        />
      </FieldGroup>

      {submitError ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg bg-status-overdue px-4 py-3 text-body3 text-auth-error"
        >
          <ErrorMark />
          <p>{submitError}</p>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Registering..." : "Register"}
      </Button>

      <p className="text-center text-body3 text-gray-700">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-500 hover:text-blue-400"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
