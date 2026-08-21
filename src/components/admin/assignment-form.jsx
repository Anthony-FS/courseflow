"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createAdminAssignment,
  getAdminAssignment,
  updateAdminAssignment,
} from "@/lib/admin-assignments";
import {
  getAdminCourseLessons,
  getAdminLessonDetail,
} from "@/lib/admin-courses";
import { validateAssignmentFields } from "@/lib/assignment-validation";
import { getCourses } from "@/lib/courses";
import { cn } from "@/lib/utils";

const ERROR_COLOR = "#9B2C6B";

const FILE_TYPE_OPTIONS = [
  { id: "pdf", label: "PDF" },
  { id: "doc", label: "DOC/DOCX" },
  { id: "image", label: "Image" },
];

const MAX_SIZE_OPTIONS = [5, 10, 20, 50];

const INITIAL_FORM = {
  courseId: "",
  lessonId: "",
  subLessonId: "",
  title: "",
  description: "",
  submissionType: "text",
  allowedFileTypes: [],
  maxFileSizeMb: 20,
};

const selectClassName =
  "h-12 w-full rounded-lg border border-gray-400 bg-white px-3 text-body2 outline-none focus:border-orange-100 disabled:bg-gray-100 disabled:text-gray-500";

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

function NativeSelect({ id, value, error, className, children, ...props }) {
  const hasError = Boolean(error);

  return (
    <div>
      <div className="relative">
        <select
          id={id}
          value={value}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={cn(selectClassName, hasError && "pr-10", className)}
          {...props}
          style={
            hasError
              ? { borderColor: ERROR_COLOR, boxShadow: "none" }
              : undefined
          }
        >
          {children}
        </select>
        {hasError ? (
          <CircleAlert
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
            style={{ color: ERROR_COLOR }}
          />
        ) : null}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function MenuSelect({
  id,
  value,
  placeholder,
  options,
  disabled = false,
  error,
  open,
  onOpenChange,
  onChange,
}) {
  const hasError = Boolean(error);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    if (!open) return undefined;

    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        onOpenChange(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={menuRef}>
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-describedby={hasError ? `${id}-error` : undefined}
          onClick={() => {
            if (!disabled) onOpenChange(!open);
          }}
          className={cn(
            "relative flex h-12 w-full items-center rounded-lg border bg-white px-3 text-left text-body2 outline-none",
            hasError ? "pr-16" : "pr-12",
            disabled
              ? "cursor-not-allowed bg-gray-100 text-gray-500"
              : "focus:border-orange-100",
            !disabled && open ? "border-orange-100" : "border-gray-400",
          )}
          style={
            hasError
              ? { borderColor: ERROR_COLOR, boxShadow: "none" }
              : undefined
          }
        >
          <span className={selected ? "text-gray-900" : "text-gray-500"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 size-4 text-gray-500"
          />
          {hasError ? (
            <CircleAlert
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-10 size-5 -translate-y-1/2"
              style={{ color: ERROR_COLOR }}
            />
          ) : null}
        </button>

        {open ? (
          <ul
            role="listbox"
            aria-labelledby={id}
            className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white py-1 shadow-card"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-body2 text-gray-700">No options</li>
            ) : (
              options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <li key={option.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full px-3 py-2 text-left text-body2 text-gray-900 hover:bg-blue-100",
                        isSelected &&
                          "bg-blue-500 text-white hover:bg-blue-500",
                      )}
                      onClick={() => {
                        onChange(option.id);
                        onOpenChange(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export default function AssignmentForm({ assignmentId = null }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [subLessons, setSubLessons] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(
    Boolean(assignmentId),
  );
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    if (!assignmentId) return;

    let cancelled = false;

    getAdminAssignment(assignmentId)
      .then((assignment) => {
        if (cancelled) return;

        setForm({
          courseId: assignment.courseId,
          lessonId: assignment.lessonId,
          subLessonId: assignment.subLessonId,
          title: assignment.title,
          description: assignment.description,
          submissionType: assignment.submissionType,
          allowedFileTypes: assignment.allowedFileTypes,
          maxFileSizeMb: assignment.maxFileSizeMb,
        });
      })
      .catch((error) => {
        if (!cancelled) setSubmitError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAssignment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    let cancelled = false;

    getCourses()
      .then((data) => {
        if (!cancelled) setCourses(data);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      return;
    }

    let cancelled = false;

    getAdminCourseLessons(form.courseId)
      .then((data) => {
        if (!cancelled) setLessons(data);
      })
      .catch(() => {
        if (!cancelled) setLessons([]);
      });

    return () => {
      cancelled = true;
    };
  }, [form.courseId]);

  useEffect(() => {
    if (!form.courseId || !form.lessonId) {
      return;
    }

    let cancelled = false;

    getAdminLessonDetail(form.courseId, form.lessonId)
      .then((lesson) => {
        if (!cancelled) setSubLessons(lesson?.subLessons ?? []);
      })
      .catch(() => {
        if (!cancelled) setSubLessons([]);
      });

    return () => {
      cancelled = true;
    };
  }, [form.courseId, form.lessonId]);

  function clearErrors(...fields) {
    setErrors((current) => {
      const next = { ...current };
      let changed = false;
      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    clearErrors(field);
  }

  function handleCourseChange(courseId) {
    setForm((current) => ({
      ...current,
      courseId,
      lessonId: "",
      subLessonId: "",
    }));
    setSubLessons([]);
    setOpenMenu(null);
    clearErrors("courseId", "lessonId", "subLessonId");
  }

  function handleLessonChange(lessonId) {
    setForm((current) => ({
      ...current,
      lessonId,
      subLessonId: "",
    }));
    setOpenMenu(null);
    clearErrors("lessonId", "subLessonId");
  }

  function handleSubmissionTypeChange(submissionType) {
    setForm((current) => ({
      ...current,
      submissionType,
      allowedFileTypes: [],
      maxFileSizeMb: 20,
    }));
    clearErrors("allowedFileTypes");
  }

  function toggleFileType(typeId) {
    setForm((current) => {
      const allowedFileTypes = current.allowedFileTypes.includes(typeId)
        ? current.allowedFileTypes.filter((id) => id !== typeId)
        : [...current.allowedFileTypes, typeId];
      return { ...current, allowedFileTypes };
    });
    clearErrors("allowedFileTypes");
  }

  function validate() {
    const nextErrors = validateAssignmentFields(form);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    const payload = {
      courseId: form.courseId,
      lessonId: form.lessonId,
      subLessonId: form.subLessonId,
      title: form.title.trim(),
      description: form.description.trim(),
      submissionType: form.submissionType,
      allowedFileTypes:
        form.submissionType === "file" ? form.allowedFileTypes : [],
      maxFileSizeMb:
        form.submissionType === "file" ? Number(form.maxFileSizeMb) : null,
    };

    setIsSubmitting(true);
    try {
      if (assignmentId) {
        await updateAdminAssignment(assignmentId, payload);
      } else {
        await createAdminAssignment(payload);
      }

      router.push("/admin/assignments");
      router.refresh();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const showFileFields = form.submissionType === "file";
  const allowedFilesError = errors.allowedFileTypes;

  return (
    <main className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">
          {assignmentId ? "Edit Assignment" : "Add Assignment"}
        </h1>
        <div className="flex items-center gap-4">
          <Button asChild variant="secondary" className="min-h-12 px-8 py-3">
            <Link href="/admin/assignments">Cancel</Link>
          </Button>
          <Button
            type="submit"
            form="assignment-form"
            disabled={isSubmitting || isLoadingAssignment}
            className="min-h-12 px-8 py-3"
          >
            {isLoadingAssignment
              ? "Loading..."
              : isSubmitting
                ? assignmentId
                  ? "Saving..."
                  : "Creating..."
                : assignmentId
                  ? "Save"
                  : "Create"}
          </Button>
        </div>
      </header>

      <form
        id="assignment-form"
        onSubmit={handleSubmit}
        noValidate
        className="m-10 rounded-2xl bg-white px-10 py-5 shadow-card"
      >
        <div className="grid grid-cols-2 gap-x-10 gap-y-8">
          <div className="col-span-2">
            <label
              htmlFor="assignment-course"
              className="mb-1.5 block text-body2"
            >
              Course
            </label>
            <MenuSelect
              id="assignment-course"
              value={form.courseId}
              placeholder="Select course"
              error={errors.courseId}
              open={openMenu === "course"}
              onOpenChange={(open) => setOpenMenu(open ? "course" : null)}
              onChange={handleCourseChange}
              options={courses.map((course) => ({
                id: course.id,
                label: course.title,
              }))}
            />
          </div>

          <div>
            <label
              htmlFor="assignment-lesson"
              className="mb-1.5 block text-body2"
            >
              Lesson
            </label>
            <MenuSelect
              id="assignment-lesson"
              disabled={!form.courseId}
              value={form.lessonId}
              placeholder="Select lesson"
              error={errors.lessonId}
              open={openMenu === "lesson"}
              onOpenChange={(open) => setOpenMenu(open ? "lesson" : null)}
              onChange={handleLessonChange}
              options={lessons.map((lesson) => ({
                id: lesson.id,
                label: lesson.name,
              }))}
            />
          </div>

          <div>
            <label
              htmlFor="assignment-sub-lesson"
              className="mb-1.5 block text-body2"
            >
              Sub-lesson
            </label>
            <MenuSelect
              id="assignment-sub-lesson"
              disabled={!form.lessonId}
              value={form.subLessonId}
              placeholder="Select sub-lesson"
              error={errors.subLessonId}
              open={openMenu === "sub-lesson"}
              onOpenChange={(open) => setOpenMenu(open ? "sub-lesson" : null)}
              onChange={(subLessonId) => setField("subLessonId", subLessonId)}
              options={subLessons.map((subLesson) => ({
                id: subLesson.id,
                label: subLesson.title,
              }))}
            />
          </div>
        </div>

        <hr className="my-10 border-gray-300" />

        <h2 className="mb-8 text-headline3">Assignment detail</h2>

        <div className="grid max-w-3xl gap-8">
          <div>
            <label
              htmlFor="assignment-title"
              className="mb-1.5 block text-body2"
            >
              Assignment <span className="text-orange-500">*</span>
            </label>
            <div>
              <div className="relative">
                <input
                  id="assignment-title"
                  value={form.title}
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={
                    errors.title ? "assignment-title-error" : undefined
                  }
                  onChange={(event) => setField("title", event.target.value)}
                  className={cn(
                    "h-12 w-full rounded-lg border border-gray-400 px-3 text-body2 outline-none focus:border-orange-100",
                    errors.title && "pr-10",
                  )}
                  style={
                    errors.title
                      ? { borderColor: ERROR_COLOR, boxShadow: "none" }
                      : undefined
                  }
                />
                {errors.title ? (
                  <CircleAlert
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
                    style={{ color: ERROR_COLOR }}
                  />
                ) : null}
              </div>
              <FieldError id="assignment-title-error" message={errors.title} />
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-body2">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-400 px-3 py-3 text-body2 outline-none focus:border-orange-100"
            />
          </label>

          <div>
            <label
              htmlFor="assignment-submission"
              className="mb-1.5 block text-body2"
            >
              Submission
            </label>
            <NativeSelect
              id="assignment-submission"
              value={form.submissionType}
              onChange={(event) =>
                handleSubmissionTypeChange(event.target.value)
              }
            >
              <option value="text">Text</option>
              <option value="file">File upload</option>
              <option value="url">URL</option>
            </NativeSelect>
          </div>

          {showFileFields ? (
            <>
              <fieldset>
                <legend className="mb-3 text-body2">Allowed files</legend>
                <div
                  className="relative rounded-lg border px-4 py-3"
                  style={
                    allowedFilesError
                      ? { borderColor: ERROR_COLOR }
                      : { borderColor: "transparent" }
                  }
                >
                  <div className="flex flex-wrap gap-8 pr-10">
                    {FILE_TYPE_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-3 text-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={form.allowedFileTypes.includes(option.id)}
                          onChange={() => toggleFileType(option.id)}
                          className="size-5 accent-blue-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {allowedFilesError ? (
                    <CircleAlert
                      aria-hidden
                      className="pointer-events-none absolute top-3 right-3 size-5"
                      style={{ color: ERROR_COLOR }}
                    />
                  ) : null}
                </div>
                <FieldError
                  id="assignment-allowed-files-error"
                  message={allowedFilesError}
                />
              </fieldset>

              <label className="block max-w-xs">
                <span className="mb-1.5 block text-body2">Max file size</span>
                <NativeSelect
                  id="assignment-max-size"
                  value={String(form.maxFileSizeMb)}
                  onChange={(event) =>
                    setField("maxFileSizeMb", Number(event.target.value))
                  }
                >
                  {MAX_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} MB
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </>
          ) : null}
        </div>

        {submitError ? (
          <p
            role="alert"
            className="mt-6 text-body2"
            style={{ color: ERROR_COLOR }}
          >
            {submitError}
          </p>
        ) : null}
      </form>
    </main>
  );
}