"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleAlert, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CourseLessonsSection } from "@/components/course-lessons-section";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "Place Holder";
const ERROR_MESSAGE = "Please fill out this field";
const ERROR_COLOR = "#9B2C6B";

const REQUIRED_FIELDS = [
  "courseName",
  "price",
  "learningTime",
  "courseSummary",
  "courseDetail",
  "coverImage",
  "videoTrailer",
];

function FieldLabel({ htmlFor, required, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-body3 font-medium text-gray-900"
    >
      {children}
      {required ? <span className="text-orange-500"> *</span> : null}
    </label>
  );
}

function FieldError({ id, show }) {
  if (!show) return null;

  return (
    <p
      id={id}
      className="mt-1.5 text-body4"
      style={{ color: ERROR_COLOR }}
      role="alert"
    >
      {ERROR_MESSAGE}
    </p>
  );
}

function TextInput({ id, className, error, onChange, ...props }) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          data-slot="input"
          {...props}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={onChange}
          className={cn(
            "h-12 min-h-12 w-full rounded-lg px-4 text-body3",
            error && "pr-10",
            className
          )}
          style={
            error
              ? { borderColor: ERROR_COLOR, boxShadow: "none" }
              : undefined
          }
        />
        {error ? (
          <CircleAlert
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
            style={{ color: ERROR_COLOR }}
          />
        ) : null}
      </div>
      <FieldError id={`${id}-error`} show={error} />
    </div>
  );
}

function TextArea({ id, className, error, onChange, ...props }) {
  return (
    <div>
      <div className="relative">
        <textarea
          id={id}
          data-slot="textarea"
          {...props}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={onChange}
          className={cn(
            "w-full rounded-lg px-4 py-3 text-body3",
            error && "pr-10",
            className
          )}
          style={
            error
              ? { borderColor: ERROR_COLOR, boxShadow: "none" }
              : undefined
          }
        />
        {error ? (
          <CircleAlert
            aria-hidden
            className="pointer-events-none absolute top-3 right-3 size-5"
            style={{ color: ERROR_COLOR }}
          />
        ) : null}
      </div>
      <FieldError id={`${id}-error`} show={error} />
    </div>
  );
}

function UploadBox({
  id,
  label,
  accept,
  file,
  onChange,
  error,
  size = "default",
}) {
  const inputRef = useRef(null);

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border bg-gray-100 text-body3 text-blue-500 transition-colors",
          "hover:border-blue-300 hover:bg-blue-100",
          "focus-visible:outline-none focus-visible:shadow-focus",
          size === "sm" ? "size-36" : "size-44",
          !error && "border-gray-300"
        )}
        style={error ? { borderColor: ERROR_COLOR } : undefined}
      >
        <Plus className="size-6 stroke-[1.75]" aria-hidden />
        <span className="max-w-32 truncate px-2">
          {file ? file.name : label}
        </span>
      </button>
      <FieldError id={`${id}-error`} show={error} />
    </div>
  );
}

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

function AddCourseForm({ cancelHref = "/admin/courses" }) {
  const [promoEnabled, setPromoEnabled] = useState(true);
  const [discountType, setDiscountType] = useState("thb");
  const [values, setValues] = useState({
    courseName: "",
    price: "",
    learningTime: "",
    courseSummary: "",
    courseDetail: "",
  });
  const [coverImage, setCoverImage] = useState(null);
  const [videoTrailer, setVideoTrailer] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});

  function clearError(field) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  }

  function validate() {
    const nextErrors = {};

    for (const field of REQUIRED_FIELDS) {
      if (field === "coverImage") {
        if (!coverImage) nextErrors.coverImage = true;
        continue;
      }
      if (field === "videoTrailer") {
        if (!videoTrailer) nextErrors.videoTrailer = true;
        continue;
      }
      if (isBlank(values[field])) {
        nextErrors[field] = true;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    // Form wiring only for now — connect to API later.
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-300 bg-white px-10 py-5">
        <h1 className="text-headline3 text-gray-900">Add Course</h1>
        <div className="flex items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" form="add-course-form" size="sm">
            Create
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-8 px-10 py-8">
        <form
          id="add-course-form"
          onSubmit={handleSubmit}
          noValidate
          className="mx-auto max-w-5xl rounded-xl border border-gray-300 bg-white p-8 shadow-card"
        >
          <div className="space-y-6">
            <div>
              <FieldLabel htmlFor="course-name" required>
                Course name
              </FieldLabel>
              <TextInput
                id="course-name"
                name="courseName"
                value={values.courseName}
                onChange={(event) =>
                  updateField("courseName", event.target.value)
                }
                error={Boolean(errors.courseName)}
                placeholder={PLACEHOLDER}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="price" required>
                  Price
                </FieldLabel>
                <TextInput
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  error={Boolean(errors.price)}
                  placeholder={PLACEHOLDER}
                />
              </div>
              <div>
                <FieldLabel htmlFor="learning-time" required>
                  Total learning time
                </FieldLabel>
                <TextInput
                  id="learning-time"
                  name="learningTime"
                  value={values.learningTime}
                  onChange={(event) =>
                    updateField("learningTime", event.target.value)
                  }
                  error={Boolean(errors.learningTime)}
                  placeholder={PLACEHOLDER}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-body3 font-medium text-gray-900">
                <input
                  type="checkbox"
                  name="promoEnabled"
                  checked={promoEnabled}
                  onChange={(event) => setPromoEnabled(event.target.checked)}
                  className="size-4 rounded border-gray-400 accent-blue-500"
                />
                Promo code
              </label>

              {promoEnabled ? (
                <div className="space-y-5 rounded-xl bg-blue-100/60 p-5">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="promo-code">Set promo code</FieldLabel>
                      <TextInput
                        id="promo-code"
                        name="promoCode"
                        defaultValue="NEWYEAR200"
                        placeholder={PLACEHOLDER}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="min-purchase">
                        Minimum purchase amount (THB)
                      </FieldLabel>
                      <TextInput
                        id="min-purchase"
                        name="minPurchase"
                        type="number"
                        min="0"
                        defaultValue="0"
                        placeholder={PLACEHOLDER}
                      />
                    </div>
                  </div>

                  <fieldset>
                    <legend className="mb-3 text-body3 font-medium text-gray-900">
                      Select discount type
                    </legend>
                    <div className="flex flex-wrap items-center gap-8">
                      <label className="inline-flex items-center gap-2 text-body3 text-gray-900">
                        <input
                          type="radio"
                          name="discountType"
                          value="thb"
                          checked={discountType === "thb"}
                          onChange={() => setDiscountType("thb")}
                          className="size-4 accent-blue-500"
                        />
                        Discount (THB)
                        <TextInput
                          id="discount-thb"
                          name="discountThb"
                          type="number"
                          min="0"
                          defaultValue="200"
                          disabled={discountType !== "thb"}
                          className="ml-1 h-10 min-h-10 w-28"
                          placeholder={PLACEHOLDER}
                        />
                      </label>

                      <label className="inline-flex items-center gap-2 text-body3 text-gray-900">
                        <input
                          type="radio"
                          name="discountType"
                          value="percent"
                          checked={discountType === "percent"}
                          onChange={() => setDiscountType("percent")}
                          className="size-4 accent-blue-500"
                        />
                        Discount (%)
                        <TextInput
                          id="discount-percent"
                          name="discountPercent"
                          type="number"
                          min="0"
                          max="100"
                          disabled={discountType !== "percent"}
                          className="ml-1 h-10 min-h-10 w-28"
                          placeholder={PLACEHOLDER}
                        />
                      </label>
                    </div>
                  </fieldset>
                </div>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="course-summary" required>
                Course summary
              </FieldLabel>
              <TextArea
                id="course-summary"
                name="courseSummary"
                rows={4}
                value={values.courseSummary}
                onChange={(event) =>
                  updateField("courseSummary", event.target.value)
                }
                error={Boolean(errors.courseSummary)}
                placeholder={PLACEHOLDER}
              />
            </div>

            <div>
              <FieldLabel htmlFor="course-detail" required>
                Course detail
              </FieldLabel>
              <TextArea
                id="course-detail"
                name="courseDetail"
                rows={8}
                value={values.courseDetail}
                onChange={(event) =>
                  updateField("courseDetail", event.target.value)
                }
                error={Boolean(errors.courseDetail)}
                placeholder={PLACEHOLDER}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-body3 font-medium text-gray-900">
                  Cover image <span className="text-orange-500">*</span>
                </p>
                <p className="mt-1 text-body4 text-gray-600">
                  Supported file types: .jpg, .png, .jpeg. Max file size: 5 MB
                </p>
              </div>
              <UploadBox
                id="cover-image"
                label="Upload Image"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                file={coverImage}
                error={Boolean(errors.coverImage)}
                onChange={(file) => {
                  setCoverImage(file);
                  clearError("coverImage");
                }}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-body3 font-medium text-gray-900">
                  Video Trailer <span className="text-orange-500">*</span>
                </p>
                <p className="mt-1 text-body4 text-gray-600">
                  Supported file types: .mp4, .mov, .avi Max file size: 20 MB
                </p>
              </div>
              <UploadBox
                id="video-trailer"
                label="Upload Video"
                accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
                file={videoTrailer}
                error={Boolean(errors.videoTrailer)}
                onChange={(file) => {
                  setVideoTrailer(file);
                  clearError("videoTrailer");
                }}
              />
            </div>

            <div className="space-y-3">
              <p className="text-body3 font-medium text-gray-900">
                Attach File (Optional)
              </p>
              <UploadBox
                id="attach-file"
                label="Upload file"
                accept="*/*"
                file={attachment}
                onChange={setAttachment}
                size="sm"
              />
            </div>
          </div>
        </form>

        <CourseLessonsSection />
      </main>
    </div>
  );
}

export { AddCourseForm };
