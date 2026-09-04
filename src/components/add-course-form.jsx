"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Play,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAddCourseDraft } from "@/components/admin/add-course-draft-content";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CourseLessonsSection } from "@/components/course-lessons-section";
import {
  createAdminCourse,
  getAdminCourse,
  updateAdminCourse,
  uploadAdminFile,
} from "@/lib/admin-courses";
import { validateUpload } from "@/lib/admin-uploads";
import {
  COURSE_LIMITS,
  COURSE_TAG_OPTIONS,
  DEFAULT_COURSE_TAG,
  EMPTY_FIELD_MESSAGE,
  isFreePrice,
  trimCourseCode,
  validateCourseFields,
  validatePromoFields,
} from "@/lib/course-validation";
import { resolveCoverUrl, resolveTrailerUrl } from "@/lib/courses";
import {
  clampPercentDiscount,
  digitsOnly,
  normalizePromoCode,
} from "@/lib/promo-codes";
import { cn } from "@/lib/utils";

const ERROR_COLOR = "#9B2C6B";

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

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p
      id={id}
      className="mt-1.5 text-body4"
      style={{ color: ERROR_COLOR }}
      role="alert"
    >
      {message}
    </p>
  );
}

function TextInput({ id, className, error, onChange, hint, ...props }) {
  const hasError = Boolean(error);

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          data-slot="input"
          {...props}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          onChange={onChange}
          className={cn(
            "h-12 min-h-12 w-full rounded-lg px-4 text-body3",
            hasError && "pr-10",
            className
          )}
          style={
            hasError
              ? { borderColor: ERROR_COLOR, boxShadow: "none" }
              : undefined
          }
        />
        {hasError ? (
          <CircleAlert
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
            style={{ color: ERROR_COLOR }}
          />
        ) : null}
      </div>
      {hint && !hasError ? (
        <p className="mt-1.5 text-body4 font-medium text-green">{hint}</p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/**
 * Single-select dropdown styled to match the "Courses Included" control on the
 * promo-code create/edit forms (src/app/admin/promo-codes/*). That control is
 * inline markup rather than a shared component, so the trigger and menu classes
 * below are deliberately kept identical to it. It is multi-select (checkboxes);
 * this field is single-select, so it uses radios and closes on choose — the
 * appearance is shared, the selection model is not.
 */
function FieldTagSelect({ id, name, value, options, onChange, error }) {
  const hasError = Boolean(error);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selected = options.find((option) => option.slug === value);

  return (
    <div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          id={id}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          // `aria-invalid` is not valid on role=button; the error below carries
          // role="alert" and is linked via aria-describedby instead.
          aria-describedby={hasError ? `${id}-error` : undefined}
          onClick={() => setIsOpen((open) => !open)}
          className={`relative flex min-h-12 w-full items-center rounded-lg border bg-white px-3 pr-12 text-left text-body2 outline-none focus:border-orange-100 ${
            isOpen ? "border-orange-100" : "border-gray-400"
          }`}
          style={hasError ? { borderColor: ERROR_COLOR } : undefined}
        >
          <span>{selected?.name}</span>
          {isOpen ? (
            <ChevronUp
              aria-hidden="true"
              className="pointer-events-none absolute right-4 size-4 text-gray-500"
            />
          ) : (
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-4 size-4 text-gray-500"
            />
          )}
        </button>

        {isOpen ? (
          <div className="absolute z-20 mt-3 max-h-80 w-full overflow-y-auto rounded-lg bg-white p-3 shadow-card">
            {options.map((option) => (
              <label
                key={option.slug}
                className="flex cursor-pointer items-center gap-3 px-2 py-2 text-gray-700"
              >
                <input
                  type="radio"
                  name={name}
                  value={option.slug}
                  checked={option.slug === value}
                  onChange={() => {
                    onChange(option.slug);
                    setIsOpen(false);
                  }}
                  className="size-5 accent-blue-500"
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function TextArea({
  id,
  className,
  error,
  onChange,
  maxLength,
  value,
  ...props
}) {
  const hasError = Boolean(error);
  const length = String(value ?? "").length;

  return (
    <div>
      <div className="relative">
        <textarea
          id={id}
          data-slot="textarea"
          {...props}
          value={value}
          maxLength={maxLength}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          onChange={onChange}
          className={cn(
            "w-full rounded-lg px-4 py-3 text-body3",
            hasError && "pr-10",
            className
          )}
          style={
            hasError
              ? { borderColor: ERROR_COLOR, boxShadow: "none" }
              : undefined
          }
        />
        {hasError ? (
          <CircleAlert
            aria-hidden
            className="pointer-events-none absolute top-3 right-3 size-5"
            style={{ color: ERROR_COLOR }}
          />
        ) : null}
      </div>
      {typeof maxLength === "number" ? (
        <p className="mt-1 text-right text-body4 text-gray-600">
          {length}/{maxLength}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function fileNameFromUrl(url) {
  const path = String(url ?? "").split("?")[0];
  const name = path.split("/").filter(Boolean).pop();
  if (!name) return "file";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function UploadBox({
  id,
  label,
  accept,
  file,
  existingName,
  existingUrl,
  onChange,
  error,
  size = "default",
  preview = "file",
}) {
  const inputRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const displayName = file?.name || existingName;
  const hasMedia = Boolean(displayName || objectUrl || existingUrl);

  useEffect(() => {
    if (!(file instanceof Blob)) {
      setObjectUrl(null);
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  const resolvedExistingUrl = existingUrl
    ? preview === "image"
      ? resolveCoverUrl(existingUrl)
      : preview === "video"
        ? resolveTrailerUrl(existingUrl)
        : existingUrl
    : null;

  const previewSrc = objectUrl || resolvedExistingUrl || null;
  const showImagePreview = preview === "image" && Boolean(previewSrc);
  const showVideoPreview = preview === "video" && Boolean(previewSrc);
  const hasPreviewMedia = showImagePreview || showVideoPreview;

  const tooltipLabel =
    preview === "image"
      ? hasMedia
        ? "Change cover"
        : "Add"
      : preview === "video"
        ? hasMedia
          ? "Change trailer"
          : "Add"
        : null;

  function handleClear(event) {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange(null);
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null;
    const accepted = onChange(nextFile);
    if (accepted === false && inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const uploadButton = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      aria-invalid={error || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border bg-gray-100 text-body3 text-blue-500 transition-colors",
        "hover:border-blue-300 hover:bg-blue-100",
        "focus-visible:outline-none focus-visible:shadow-focus",
        size === "sm" ? "size-36" : "size-44",
        !error && "border-gray-300",
        hasPreviewMedia && "p-0 hover:bg-gray-100",
      )}
      style={error ? { borderColor: ERROR_COLOR } : undefined}
    >
      {showImagePreview ? (
        <img
          src={previewSrc}
          alt={displayName || "Cover preview"}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}

      {showVideoPreview ? (
        <>
          <video
            src={previewSrc}
            className="absolute inset-0 size-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <span className="relative z-10 grid size-10 place-items-center rounded-full bg-white/95 text-blue-500 shadow-card">
            <Play className="size-5 fill-blue-500" aria-hidden />
          </span>
        </>
      ) : null}

      {!showImagePreview && !showVideoPreview ? (
        <>
          <Plus className="size-6 stroke-[1.75]" aria-hidden />
          <span className="max-w-32 truncate px-2">
            {displayName || label}
          </span>
        </>
      ) : null}
    </button>
  );

  return (
    <div>
      <div className="relative inline-block">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileChange}
        />
        {tooltipLabel ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{uploadButton}</TooltipTrigger>
              <TooltipContent side="right">{tooltipLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          uploadButton
        )}
        {hasMedia ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Remove ${displayName || "file"}`}
            className="absolute -top-1.5 -right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-400 bg-white text-gray-700 shadow-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <FieldError id={`${id}-error`} message={error || undefined} />
    </div>
  );
}

function AddCourseForm({
  cancelHref = "/admin/courses",
  mode = "create",
  courseId = null,
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const draftContent = useAddCourseDraft();
  const useDraft = !isEdit && draftContent != null;
  const clearDraft = draftContent?.clearDraft ?? (() => {});

  const [promoEnabledState, setPromoEnabled] = useState(!isEdit);
  const [discountTypeState, setDiscountType] = useState("thb");
  const [promoState, setPromo] = useState({
    code: isEdit ? "" : "NEWYEAR200",
    minPurchase: "0",
    discountThb: isEdit ? "" : "200",
    discountPercent: "",
  });
  const [valuesState, setValues] = useState({
    courseName: "",
    courseCode: "",
    tag: DEFAULT_COURSE_TAG,
    price: "",
    learningTime: "",
    courseSummary: "",
    courseDetail: "",
  });
  const [coverImageState, setCoverImage] = useState(null);
  const [videoTrailerState, setVideoTrailer] = useState(null);
  const [attachmentState, setAttachment] = useState(null);
  const [existingCover, setExistingCover] = useState(null);
  const [existingTrailer, setExistingTrailer] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [lessonsState, setLessons] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadStatus, setLoadStatus] = useState(isEdit ? "loading" : "ready");

  const promoEnabled = useDraft
    ? draftContent.draft.promoEnabled
    : promoEnabledState;
  const discountType = useDraft
    ? draftContent.draft.discountType
    : discountTypeState;
  const promo = useDraft ? draftContent.draft.promo : promoState;
  const values = useDraft ? draftContent.draft.values : valuesState;
  const coverImage = useDraft ? draftContent.draft.coverImage : coverImageState;
  const videoTrailer = useDraft
    ? draftContent.draft.videoTrailer
    : videoTrailerState;
  const attachment = useDraft ? draftContent.draft.attachment : attachmentState;
  const lessons = useDraft ? draftContent.draft.lessons : lessonsState;

  useEffect(() => {
    if (!isEdit || !courseId) return undefined;

    let cancelled = false;

    async function loadCourse() {
      setLoadStatus("loading");
      setSubmitError("");

      try {
        const data = await getAdminCourse(courseId);
        if (cancelled) return;

        setValues({
          courseName: data.title ?? "",
          courseCode: data.courseCode ?? "",
          tag: data.tag || DEFAULT_COURSE_TAG,
          price: data.price == null ? "" : String(data.price),
          learningTime: data.totalLearningTime ?? "",
          courseSummary: data.summary ?? "",
          courseDetail: data.description ?? "",
        });

        setExistingCover(
          data.coverImageUrl
            ? { url: data.coverImageUrl, name: fileNameFromUrl(data.coverImageUrl) }
            : null,
        );
        setExistingTrailer(
          data.videoTrailerUrl
            ? {
                url: data.videoTrailerUrl,
                name: fileNameFromUrl(data.videoTrailerUrl),
              }
            : null,
        );
        setExistingAttachment(
          data.attachment?.fileUrl
            ? {
                url: data.attachment.fileUrl,
                name: data.attachment.name || fileNameFromUrl(data.attachment.fileUrl),
                fileType: data.attachment.fileType ?? "",
              }
            : null,
        );

        if (data.promo) {
          const type = data.promo.discountType === "percent" ? "percent" : "thb";
          setPromoEnabled(true);
          setDiscountType(type);
          setPromo({
            code: data.promo.code ?? "",
            minPurchase: String(data.promo.minPurchaseAmount ?? 0),
            discountThb: type === "thb" ? String(data.promo.discountValue ?? "") : "",
            discountPercent:
              type === "percent" ? String(data.promo.discountValue ?? "") : "",
          });
        } else {
          setPromoEnabled(false);
          setDiscountType("thb");
          setPromo({
            code: "",
            minPurchase: "0",
            discountThb: "",
            discountPercent: "",
          });
        }

        setLoadStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error.message || "Failed to load course");
          setLoadStatus("error");
        }
      }
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [isEdit, courseId]);

  function patchDraft(patch) {
    if (useDraft) {
      draftContent.setDraft((current) => ({ ...current, ...patch }));
      return;
    }
    if ("promoEnabled" in patch) setPromoEnabled(patch.promoEnabled);
    if ("discountType" in patch) setDiscountType(patch.discountType);
    if ("coverImage" in patch) setCoverImage(patch.coverImage);
    if ("videoTrailer" in patch) setVideoTrailer(patch.videoTrailer);
    if ("attachment" in patch) setAttachment(patch.attachment);
    if ("lessons" in patch) setLessons(patch.lessons);
  }

  function clearError(field) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function acceptSelectedUpload(kind, file) {
    if (!file) {
      return true;
    }

    const result = validateUpload(kind, file);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }

    return true;
  }

  function updateField(field, value) {
    if (useDraft) {
      draftContent.setDraft((current) => ({
        ...current,
        values: { ...current.values, [field]: value },
      }));
    } else {
      setValues((current) => ({ ...current, [field]: value }));
    }
    clearError(field);
  }

  function updatePromo(field, value) {
    if (useDraft) {
      draftContent.setDraft((current) => ({
        ...current,
        promo: { ...current.promo, [field]: value },
      }));
    } else {
      setPromo((current) => ({ ...current, [field]: value }));
    }
  }

  function handleDiscountTypeChange(type) {
    if (useDraft) {
      draftContent.setDraft((current) => ({
        ...current,
        discountType: type,
        promo: {
          ...current.promo,
          discountThb: "",
          discountPercent: "",
        },
      }));
    } else {
      setDiscountType(type);
      setPromo((current) => ({
        ...current,
        discountThb: "",
        discountPercent: "",
      }));
    }
    clearError("discountValue");
  }

  function validate() {
    const nextErrors = {
      ...validateCourseFields(values),
      ...validatePromoFields({
        enabled: promoEnabled,
        code: promo.code,
        discountType,
        discountValue:
          discountType === "thb" ? promo.discountThb : promo.discountPercent,
        minPurchaseAmount: promo.minPurchase,
        price: values.price,
      }),
    };

    if (!coverImage && !existingCover) nextErrors.coverImage = EMPTY_FIELD_MESSAGE;
    if (!videoTrailer && !existingTrailer) {
      nextErrors.videoTrailer = EMPTY_FIELD_MESSAGE;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let coverImageUrl = existingCover?.url ?? "";
      let videoTrailerUrl = existingTrailer?.url ?? "";

      const uploads = [];
      if (coverImage) {
        uploads.push(
          uploadAdminFile("cover", coverImage).then((uploaded) => {
            coverImageUrl = uploaded.fileUrl;
          }),
        );
      }
      if (videoTrailer) {
        uploads.push(
          uploadAdminFile("trailer", videoTrailer).then((uploaded) => {
            videoTrailerUrl = uploaded.fileUrl;
          }),
        );
      }
      await Promise.all(uploads);

      let attachmentPayload = null;
      if (attachment) {
        const uploaded = await uploadAdminFile("attachment", attachment);
        attachmentPayload = {
          name: uploaded.name,
          fileUrl: uploaded.fileUrl,
          fileType: uploaded.fileType,
        };
      } else if (existingAttachment?.url) {
        attachmentPayload = {
          name: existingAttachment.name,
          fileUrl: existingAttachment.url,
          fileType: existingAttachment.fileType,
        };
      }

      const discountValue =
        discountType === "thb" ? promo.discountThb : promo.discountPercent;

      const payload = {
        title: values.courseName.trim(),
        courseCode: trimCourseCode(values.courseCode),
        tag: values.tag,
        summary: values.courseSummary.trim(),
        description: values.courseDetail.trim(),
        price: Number(values.price),
        totalLearningTime: values.learningTime.trim(),
        coverImageUrl,
        videoTrailerUrl,
        attachment: attachmentPayload,
        promo: promoEnabled
          ? {
              code: promo.code.trim(),
              minPurchaseAmount: Number(promo.minPurchase || 0),
              discountType,
              discountValue: Number(discountValue),
            }
          : null,
      };

      if (isEdit) {
        await updateAdminCourse(courseId, payload);
        router.push("/admin/courses");
      } else {
        const created = await createAdminCourse({
          ...payload,
          lessons: lessons.map((lesson, index) => ({
            title: lesson.name,
            sortOrder: index,
            subLessons: lesson.subLessons,
          })),
        });
        clearDraft();
        router.push(`/admin/courses?created=${created.id}`);
      }
      router.refresh();
    } catch (err) {
      if (err?.fields && typeof err.fields === "object") {
        setErrors((current) => ({ ...current, ...err.fields }));
      }
      const message =
        err.message ||
        (isEdit ? "Failed to update course" : "Failed to create course");
      toast.error(message);
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-300 bg-white px-10 py-5">
        <h1 className="text-headline3 text-gray-900">
          {isEdit ? "Edit course" : "Add Course"}
        </h1>
        <div className="flex items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href={cancelHref} onClick={clearDraft}>
              Cancel
            </Link>
          </Button>
          <Button
            type="submit"
            form="add-course-form"
            size="sm"
            disabled={isSubmitting || (isEdit && loadStatus !== "ready")}
          >
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save"
                : "Create"}
          </Button>
        </div>
      </header>

      <main className="space-y-8 px-10 py-8">
        {submitError ? (
          <p
            className="mx-auto max-w-5xl text-body3"
            style={{ color: ERROR_COLOR }}
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        {!isEdit || loadStatus === "ready" ? (
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
                maxLength={COURSE_LIMITS.title}
                onChange={(event) =>
                  updateField("courseName", event.target.value)
                }
                error={errors.courseName}
                placeholder="Enter course name"
              />
            </div>

            <div>
              <FieldLabel htmlFor="course-code" required>
                Course code
              </FieldLabel>
              <TextInput
                id="course-code"
                name="courseCode"
                value={values.courseCode}
                maxLength={COURSE_LIMITS.courseCode}
                required
                onChange={(event) =>
                  updateField("courseCode", event.target.value)
                }
                error={errors.courseCode}
                placeholder="Enter course code"
              />
            </div>

            <div>
              <FieldLabel htmlFor="course-tag" required>
                Tag
              </FieldLabel>
              <FieldTagSelect
                id="course-tag"
                name="tag"
                value={values.tag || DEFAULT_COURSE_TAG}
                options={COURSE_TAG_OPTIONS}
                onChange={(slug) => updateField("tag", slug)}
                error={errors.tag}
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
                  error={errors.price}
                  hint={isFreePrice(values.price) ? "Free" : undefined}
                  placeholder="Enter Price"
                />
              </div>
              <div>
                <FieldLabel htmlFor="learning-time" required>
                  Total learning time
                </FieldLabel>
                <TextInput
                  id="learning-time"
                  name="learningTime"
                  type="number"
                  min="1"
                  step="1"
                  value={values.learningTime}
                  onChange={(event) =>
                    updateField("learningTime", event.target.value)
                  }
                  error={errors.learningTime}
                  placeholder="Hours"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-body3 font-medium text-gray-900">
                <input
                  type="checkbox"
                  name="promoEnabled"
                  checked={promoEnabled}
                  onChange={(event) =>
                    patchDraft({ promoEnabled: event.target.checked })
                  }
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
                        value={promo.code}
                        onChange={(event) => {
                          updatePromo("code", normalizePromoCode(event.target.value));
                          clearError("promoCode");
                        }}
                        error={errors.promoCode}
                        placeholder="Enter promo code"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="min-purchase">
                        Minimum purchase amount (THB)
                      </FieldLabel>
                      <TextInput
                        id="min-purchase"
                        name="minPurchase"
                        inputMode="numeric"
                        value={promo.minPurchase}
                        onChange={(event) => {
                          updatePromo("minPurchase", digitsOnly(event.target.value));
                          clearError("minPurchase");
                        }}
                        error={errors.minPurchase}
                        placeholder="THB"
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
                          onChange={() => handleDiscountTypeChange("thb")}
                          className="size-4 accent-blue-500"
                        />
                        Discount (THB)
                        <TextInput
                          id="discount-thb"
                          name="discountThb"
                          inputMode="numeric"
                          value={discountType === "thb" ? promo.discountThb : ""}
                          onChange={(event) => {
                            updatePromo("discountThb", digitsOnly(event.target.value));
                            clearError("discountValue");
                          }}
                          disabled={discountType !== "thb"}
                          error={
                            discountType === "thb"
                              ? errors.discountValue
                              : undefined
                          }
                          className="ml-1 h-10 min-h-10 w-28"
                          placeholder="THB"
                        />
                      </label>

                      <label className="inline-flex items-center gap-2 text-body3 text-gray-900">
                        <input
                          type="radio"
                          name="discountType"
                          value="percent"
                          checked={discountType === "percent"}
                          onChange={() => handleDiscountTypeChange("percent")}
                          className="size-4 accent-blue-500"
                        />
                        Discount (%)
                        <TextInput
                          id="discount-percent"
                          name="discountPercent"
                          inputMode="numeric"
                          value={
                            discountType === "percent" ? promo.discountPercent : ""
                          }
                          onChange={(event) => {
                            updatePromo(
                              "discountPercent",
                              digitsOnly(event.target.value),
                            );
                            clearError("discountValue");
                          }}
                          onBlur={() => {
                            if (discountType !== "percent") return;
                            updatePromo(
                              "discountPercent",
                              clampPercentDiscount(promo.discountPercent),
                            );
                          }}
                          disabled={discountType !== "percent"}
                          error={
                            discountType === "percent"
                              ? errors.discountValue
                              : undefined
                          }
                          className="ml-1 h-10 min-h-10 w-28"
                          placeholder="%"
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
                maxLength={COURSE_LIMITS.summary}
                onChange={(event) =>
                  updateField("courseSummary", event.target.value)
                }
                error={errors.courseSummary}
                placeholder="Enter course summary"
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
                maxLength={COURSE_LIMITS.description}
                onChange={(event) =>
                  updateField("courseDetail", event.target.value)
                }
                error={errors.courseDetail}
                placeholder="Enter course detail"
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
                existingName={existingCover?.name}
                existingUrl={existingCover?.url}
                preview="image"
                error={errors.coverImage}
                onChange={(file) => {
                  if (!file) {
                    patchDraft({ coverImage: null });
                    setExistingCover(null);
                    clearError("coverImage");
                    return true;
                  }
                  if (!acceptSelectedUpload("cover", file)) {
                    return false;
                  }
                  patchDraft({ coverImage: file });
                  clearError("coverImage");
                  return true;
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
                existingName={existingTrailer?.name}
                existingUrl={existingTrailer?.url}
                preview="video"
                error={errors.videoTrailer}
                onChange={(file) => {
                  if (!file) {
                    patchDraft({ videoTrailer: null });
                    setExistingTrailer(null);
                    clearError("videoTrailer");
                    return true;
                  }
                  if (!acceptSelectedUpload("trailer", file)) {
                    return false;
                  }
                  patchDraft({ videoTrailer: file });
                  clearError("videoTrailer");
                  return true;
                }}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-body3 font-medium text-gray-900">
                  Attach File (Optional)
                </p>
                <p className="mt-1 text-body4 text-gray-600">
                  Supported file types: any. Max file size: 20 MB
                </p>
              </div>
              <UploadBox
                id="attach-file"
                label="Upload file"
                accept="*/*"
                file={attachment}
                existingName={existingAttachment?.name}
                onChange={(file) => {
                  if (!file) {
                    patchDraft({ attachment: null });
                    setExistingAttachment(null);
                    return true;
                  }
                  if (!acceptSelectedUpload("attachment", file)) {
                    return false;
                  }
                  patchDraft({ attachment: file });
                  return true;
                }}
                size="sm"
              />
            </div>
          </div>
        </form>
        ) : loadStatus === "loading" ? (
          <p className="mx-auto max-w-5xl text-body3 text-gray-700">
            Loading course...
          </p>
        ) : null}

        <CourseLessonsSection
          courseId={isEdit ? courseId : undefined}
          lessons={isEdit ? undefined : lessons}
          onLessonsChange={isEdit ? undefined : (nextLessons) =>
            patchDraft({ lessons: nextLessons })
          }
        />
      </main>
    </div>
  );
}

export { AddCourseForm };
