"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAdminAssignment } from "@/lib/admin-assignments";
import {
  getAdminCourseLessons,
  getAdminLessonDetail,
} from "@/lib/admin-courses";
import { getCourses } from "@/lib/courses";
import { cn } from "@/lib/utils";

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

function NativeSelect({ value, className, children, ...props }) {
  return (
    <select
      value={value}
      className={cn(selectClassName, !value && "text-gray-500", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export default function AssignmentForm() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [subLessons, setSubLessons] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setLessons([]);
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
      setSubLessons([]);
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

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCourseChange(courseId) {
    setForm((current) => ({
      ...current,
      courseId,
      lessonId: "",
      subLessonId: "",
    }));
    setSubLessons([]);
  }

  function handleLessonChange(lessonId) {
    setForm((current) => ({
      ...current,
      lessonId,
      subLessonId: "",
    }));
  }

  function handleSubmissionTypeChange(submissionType) {
    setForm((current) => ({
      ...current,
      submissionType,
      allowedFileTypes: [],
      maxFileSizeMb: 20,
    }));
  }

  function toggleFileType(typeId) {
    setForm((current) => {
      const allowedFileTypes = current.allowedFileTypes.includes(typeId)
        ? current.allowedFileTypes.filter((id) => id !== typeId)
        : [...current.allowedFileTypes, typeId];
      return { ...current, allowedFileTypes };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.courseId || !form.lessonId || !form.subLessonId || !form.title.trim()) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    if (form.submissionType === "file" && form.allowedFileTypes.length === 0) {
      setErrorMessage("Select at least one allowed file type.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminAssignment({
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
      });
      router.push("/admin/assignments");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const showFileFields = form.submissionType === "file";

  return (
    <main className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">Add Assignment</h1>
        <div className="flex items-center gap-4">
          <Button asChild variant="secondary" className="min-h-12 px-8 py-3">
            <Link href="/admin/assignments">Cancel</Link>
          </Button>
          <Button
            type="submit"
            form="assignment-form"
            disabled={isSubmitting}
            className="min-h-12 px-8 py-3"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </header>

      <form
        id="assignment-form"
        onSubmit={handleSubmit}
        className="m-10 rounded-2xl border border-gray-300 bg-white p-10 shadow-card"
      >
        <div className="grid grid-cols-2 gap-x-10 gap-y-8">
          <label className="col-span-2 block">
            <span className="mb-1.5 block text-body2">Course</span>
            <NativeSelect
              required
              value={form.courseId}
              onChange={(event) => handleCourseChange(event.target.value)}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-body2">Lesson</span>
            <NativeSelect
              required
              disabled={!form.courseId}
              value={form.lessonId}
              onChange={(event) => handleLessonChange(event.target.value)}
            >
              <option value="">Select lesson</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-body2">Sub-lesson</span>
            <NativeSelect
              required
              disabled={!form.lessonId}
              value={form.subLessonId}
              onChange={(event) => setField("subLessonId", event.target.value)}
            >
              <option value="">Select sub-lesson</option>
              {subLessons.map((subLesson) => (
                <option key={subLesson.id} value={subLesson.id}>
                  {subLesson.title}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <hr className="my-10 border-gray-300" />

        <h2 className="mb-8 text-headline3">Assignment detail</h2>

        <div className="grid max-w-3xl gap-8">
          <label className="block">
            <span className="mb-1.5 block text-body2">
              Assignment <span className="text-orange-500">*</span>
            </span>
            <input
              required
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              className="h-12 w-full rounded-lg border border-gray-400 px-3 text-body2 outline-none focus:border-orange-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-body2">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-400 px-3 py-3 text-body2 outline-none focus:border-orange-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-body2">Submission</span>
            <NativeSelect
              value={form.submissionType}
              onChange={(event) =>
                handleSubmissionTypeChange(event.target.value)
              }
            >
              <option value="text">Text</option>
              <option value="file">File upload</option>
              <option value="url">URL</option>
            </NativeSelect>
          </label>

          {showFileFields ? (
            <>
              <fieldset>
                <legend className="mb-3 text-body2">Allowed files</legend>
                <div className="flex flex-wrap gap-8">
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
              </fieldset>

              <label className="block max-w-xs">
                <span className="mb-1.5 block text-body2">Max file size</span>
                <NativeSelect
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

        {errorMessage ? (
          <p role="alert" className="mt-6 text-body2 text-orange-500">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </main>
  );
}
