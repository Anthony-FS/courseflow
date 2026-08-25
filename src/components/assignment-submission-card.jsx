"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CHOICE_LETTERS } from "@/lib/assignment-validation";
import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import { formatCourseDate } from "@/lib/format";
import {
  putAssignmentSubmission,
  uploadAssignmentSubmissionFile,
} from "@/lib/student-submissions";
import {
  STUDENT_FILE_ACCEPT,
  STUDENT_FILE_TYPE_LABELS,
  fileNameFromStoragePath,
} from "@/lib/student-submission-validation";
import { cn } from "@/lib/utils";

const ERROR_COLOR = "#9B2C6B";
const SUCCESS_MESSAGE = "Your assignment was submitted successfully.";

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-body4" style={{ color: ERROR_COLOR }} role="alert">
      {message}
    </p>
  );
}

function UploadBox({ id, label, accept, file, existingName, onChange, error }) {
  const inputRef = useRef(null);
  const displayName = file?.name || existingName;
  const hasMedia = Boolean(displayName);

  function handleClear(event) {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  return (
    <div>
      <div className="relative inline-block">
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
            "flex size-44 flex-col items-center justify-center gap-2 rounded-lg border bg-gray-100 text-body3 text-blue-500 transition-colors",
            "hover:border-blue-300 hover:bg-blue-100",
            "focus-visible:outline-none focus-visible:shadow-focus",
            !error && "border-gray-300",
          )}
          style={error ? { borderColor: ERROR_COLOR } : undefined}
        >
          <Plus className="size-6 stroke-[1.75]" aria-hidden />
          <span className="max-w-32 truncate px-2">{displayName || label}</span>
        </button>
        {hasMedia ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Remove ${displayName}`}
            className="absolute -top-1.5 -right-1.5 z-10 flex size-6 items-center justify-center rounded-full border border-gray-400 bg-white text-gray-700 shadow-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <FieldError id={`${id}-error`} message={error || undefined} />
    </div>
  );
}

function choiceText(assignment, letter) {
  const map = {
    A: assignment.choiceA,
    B: assignment.choiceB,
    C: assignment.choiceC,
    D: assignment.choiceD,
  };
  return map[letter] || "";
}

function fileHelperText(assignment) {
  const types = (assignment.allowedFileTypes ?? [])
    .map((type) => STUDENT_FILE_TYPE_LABELS[type])
    .filter(Boolean);
  const typeLabel = types.length ? types.join(", ") : "file";
  return `Supported file types: ${typeLabel}. Max file size: ${assignment.maxFileSizeMb} MB`;
}

function fileAccept(assignment) {
  return (assignment.allowedFileTypes ?? [])
    .map((type) => STUDENT_FILE_ACCEPT[type])
    .filter(Boolean)
    .join(",");
}

export function AssignmentSubmissionCard({
  assignment,
  submission = null,
  onSubmitted,
}) {
  const initiallySubmitted = Boolean(submission?.submittedAt || submission?.status === "submitted");
  const [draft, setDraft] = useState(submission?.content ?? "");
  const [file, setFile] = useState(null);
  const [clearedFile, setClearedFile] = useState(false);
  const [isEditing, setIsEditing] = useState(!initiallySubmitted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState({
    content: submission?.content ?? "",
    submittedAt: submission?.submittedAt ?? null,
    status: submission?.status ?? null,
    answerText: assignment.answerText ?? "",
    correctChoice: assignment.correctChoice ?? "",
  });

  const hasSubmitted = Boolean(saved.submittedAt || saved.status === "submitted");
  const showInput = !hasSubmitted || isEditing;
  const type = assignment.submissionType;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    let content = String(draft ?? "").trim();

    if (type === "file") {
      if (file) {
        setIsSubmitting(true);
        try {
          const uploaded = await uploadAssignmentSubmissionFile(assignment.id, file);
          content = uploaded.path;
        } catch (uploadError) {
          setIsSubmitting(false);
          setError(uploadError.message || "Failed to upload file.");
          return;
        }
      } else if (!clearedFile && saved.content) {
        content = saved.content;
      } else {
        setError(EMPTY_FIELD_MESSAGE);
        return;
      }
    }

    if (type !== "file" && !content) {
      setError(EMPTY_FIELD_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await putAssignmentSubmission(assignment.id, content);
      const next = {
        content: result.content,
        submittedAt: result.submittedAt,
        status: result.status,
        answerText: result.answerText ?? saved.answerText,
        correctChoice: result.correctChoice ?? saved.correctChoice,
      };
      setSaved(next);
      setDraft(result.content);
      setFile(null);
      setClearedFile(false);
      setIsEditing(false);
      onSubmitted?.(result);
    } catch (saveError) {
      setError(saveError.message || "Failed to save submission.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl bg-blue-100 p-6">
      <header className="flex items-start justify-between gap-4">
        <h2 className="text-body1 font-medium text-black">Assignment</h2>
        <StatusBadge status={hasSubmitted ? "submitted" : "pending"} />
      </header>

      <p className="mt-4 text-body2 font-medium text-black">{assignment.title}</p>
      {assignment.description ? (
        <p className="mt-2 whitespace-pre-wrap text-body3 text-gray-700">
          {assignment.description}
        </p>
      ) : null}

      {showInput ? (
        <form className="mt-4" onSubmit={handleSubmit}>
          {type === "text" ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Answer..."
              rows={5}
              aria-invalid={error ? true : undefined}
              className="w-full rounded-lg border border-transparent bg-white px-4 py-3 text-body2 text-black outline-none placeholder:text-gray-500 focus:border-orange-100"
            />
          ) : null}

          {type === "url" ? (
            <input
              type="url"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="https://"
              aria-invalid={error ? true : undefined}
              className="h-12 w-full rounded-lg border border-transparent bg-white px-4 text-body2 text-black outline-none placeholder:text-gray-500 focus:border-orange-100"
            />
          ) : null}

          {type === "file" ? (
            <div className="space-y-2">
              <p className="text-body4 text-gray-700">{fileHelperText(assignment)}</p>
              <UploadBox
                id={`assignment-file-${assignment.id}`}
                label="Upload file"
                accept={fileAccept(assignment)}
                file={file}
                existingName={
                  file || clearedFile
                    ? undefined
                    : saved.content
                      ? fileNameFromStoragePath(saved.content)
                      : undefined
                }
                error={error}
                onChange={(nextFile) => {
                  setFile(nextFile);
                  setClearedFile(!nextFile);
                  setError("");
                }}
              />
            </div>
          ) : null}

          {type === "choice" ? (
            <fieldset className="space-y-3">
              <legend className="sr-only">Choose an answer</legend>
              {CHOICE_LETTERS.map((letter) => (
                <label key={letter} className="flex items-start gap-3 text-body2 text-black">
                  <input
                    type="radio"
                    name={`assignment-choice-${assignment.id}`}
                    value={letter}
                    checked={draft === letter}
                    onChange={() => setDraft(letter)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{letter}.</span> {choiceText(assignment, letter)}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {type !== "file" ? <FieldError message={error} /> : null}

          <div className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              Send Assignment
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          {type === "text" ? (
            <>
              <section>
                <h3 className="text-body3 font-medium text-black">Your answer</h3>
                <p className="mt-1 whitespace-pre-wrap text-body2 text-gray-700">
                  {saved.content}
                </p>
              </section>
              {saved.answerText ? (
                <section>
                  <h3 className="text-body3 font-medium text-black">Correct answer</h3>
                  <p className="mt-1 whitespace-pre-wrap text-body2 text-gray-700">
                    {saved.answerText}
                  </p>
                </section>
              ) : null}
            </>
          ) : null}

          {type === "choice" ? (
            <>
              <section>
                <h3 className="text-body3 font-medium text-black">Your answer</h3>
                <p className="mt-1 text-body2 text-gray-700">
                  {saved.content}. {choiceText(assignment, saved.content)}
                </p>
              </section>
              {saved.correctChoice ? (
                <section>
                  <h3 className="text-body3 font-medium text-black">Correct answer</h3>
                  <p className="mt-1 text-body2 text-gray-700">
                    {saved.correctChoice}. {choiceText(assignment, saved.correctChoice)}
                  </p>
                </section>
              ) : null}
            </>
          ) : null}

          {type === "file" || type === "url" ? (
            <section className="space-y-1 text-body2 text-gray-700">
              <p>{SUCCESS_MESSAGE}</p>
              {saved.submittedAt ? (
                <p>{formatCourseDate(saved.submittedAt)}</p>
              ) : null}
              <p>
                {type === "file"
                  ? fileNameFromStoragePath(saved.content)
                  : saved.content}
              </p>
            </section>
          ) : null}

          <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
      )}
    </article>
  );
}
