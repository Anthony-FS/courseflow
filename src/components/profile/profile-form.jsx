"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Calendar, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { validateAll, validateField, todayIsoDate } from "@/lib/register-validation";

const FIELD_DEFINITIONS = [
  { key: "fullName", label: "Name", type: "text", autoComplete: "name" },
  { key: "dob", label: "Date of Birth", type: "date", autoComplete: "bday" },
  { key: "education", label: "Educational Background", type: "text", autoComplete: "off" },
  { key: "email", label: "Email", type: "email", autoComplete: "email" },
];

export function ProfileForm({ initialProfile, email }) {
  const [values, setValues] = useState({
    fullName: initialProfile?.full_name || "",
    dob: initialProfile?.date_of_birth || "",
    education: initialProfile?.educational_background || "",
    email: email || "",
  });
  const [errors, setErrors] = useState({});
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);
  const dateRef = useRef(null);

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function handleBlur(key, value) {
    const nextValues = { ...values, [key]: value };
    setErrors((current) => ({ ...current, [key]: validateField(key, nextValues) }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setMessage("Please choose a JPG or PNG image.");
      return;
    }
    setAvatarUrl(URL.createObjectURL(file));
    setPhotoFile(file);
    setPhotoRemoved(false);
    setMessage("Photo selected.");
  }

  function handleRemovePhoto() {
    setAvatarUrl("");
    setPhotoFile(null);
    setPhotoRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
    setMessage("Photo removed.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateAll({ ...values, password: "profile-update", confirmPassword: "profile-update" });
    setErrors(nextErrors);
    setMessage("");
    if (nextErrors.fullName || nextErrors.dob || nextErrors.email) return;

    setSubmitting(true);
    try {
      if (photoFile) {
        const photoData = new FormData();
        photoData.append("file", photoFile);
        const photoResponse = await fetch("/api/profile/avatar", {
          method: "POST",
          body: photoData,
        });
        const photoResult = await photoResponse.json();
        if (!photoResponse.ok) {
          setMessage(photoResult.error || "Failed to upload photo.");
          return;
        }
        setAvatarUrl(photoResult.avatarUrl);
        setPhotoFile(null);
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, removeAvatar: photoRemoved }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.errors || {});
        setMessage(result.error || "Failed to update profile.");
        return;
      }
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mx-auto my-18 mb-27.5 grid max-w-230 grid-cols-[360px_454px] justify-center gap-29.25 max-[900px]:grid-cols-[minmax(260px,360px)_minmax(280px,454px)] max-[900px]:gap-11 max-[680px]:mt-11 max-[680px]:grid-cols-1 max-[680px]:gap-11"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex flex-col items-center pt-0.5">
        <div className="grid size-90 place-items-center overflow-hidden rounded-xl border border-blue-300 bg-blue-100 max-[680px]:size-auto max-[680px]:aspect-square max-[680px]:w-full max-[680px]:max-w-90">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Profile preview" className="size-full object-cover" width={360} height={360} />
          ) : (
            <UserRound aria-hidden="true" className="size-36 text-blue-300" strokeWidth={1.4} />
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={handlePhotoChange} />
        <Button type="button" className="mt-4 min-h-15 px-8" onClick={() => fileRef.current?.click()}>
          {avatarUrl ? "Change photo" : "Upload photo"}
        </Button>
        {avatarUrl ? (
          <button
            type="button"
            className="mt-4 font-medium text-blue-500 hover:text-blue-400"
            onClick={handleRemovePhoto}
          >
            Remove photo
          </button>
        ) : null}
      </div>

      <div className="flex w-full max-w-113.5 flex-col gap-6 max-[680px]:mx-auto">
        {FIELD_DEFINITIONS.map(({ key, label, type, autoComplete }) => (
          <div className="flex flex-col gap-1" key={key}>
            <label className="text-body2 text-black" htmlFor={`profile-${key}`}>{label}</label>
            <div className="relative">
              <input
                id={`profile-${key}`}
                ref={key === "dob" ? dateRef : undefined}
                name={key}
                type={type}
                value={values[key]}
                placeholder={key === "education" ? "Enter Educational Background" : undefined}
                max={type === "date" ? todayIsoDate() : undefined}
                autoComplete={autoComplete}
                aria-invalid={errors[key] ? "true" : undefined}
                onChange={(event) => updateValue(key, event.target.value)}
                onBlur={(event) => handleBlur(key, event.target.value)}
                className="h-12 w-full rounded-lg border border-gray-400 bg-white px-3 text-body2 text-gray-900 outline-none focus:border-orange-100 focus:ring-4 focus:ring-orange-100/20 aria-invalid:border-auth-error [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              {type === "date" ? <Calendar aria-hidden="true" className="pointer-events-none absolute top-3.5 right-4 size-5 text-gray-600" onClick={() => dateRef.current?.showPicker?.()} /> : null}
            </div>
            {errors[key] ? <p className="m-0 text-body4 text-auth-error" role="alert">{errors[key]}</p> : null}
          </div>
        ))}
        <Button type="submit" className="mt-3 w-full" disabled={submitting}>
          {submitting ? "Updating..." : "Update Profile"}
        </Button>
        {message ? <p className="m-0 text-body4 text-blue-500" role="status">{message}</p> : null}
      </div>
    </form>
  );
}
