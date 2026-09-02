"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CHOICE_LETTERS,
  choiceAnswersMatch,
  formatCorrectChoiceLabel,
  parseChoiceLetters,
  toggleChoiceLetter,
} from "@/lib/assignment-validation";
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
    <p id={id} className="mt-1.5 text-body4 text-status-overdue-foreground" role="alert">
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
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "flex size-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-gray-100 text-body3 text-blue-500 transition-colors",
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

function ChoiceOption({
  letter,
  text,
  selected,
  revealed,
  isCorrect,
  isWrongSelection,
  disabled,
  onSelect,
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(letter)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-body2 transition-colors",
        "focus-visible:outline-none focus-visible:shadow-focus",
        !revealed && "cursor-pointer border-gray-300 bg-white hover:border-blue-300",
        !revealed && selected && "border-blue-500 bg-blue-100 ring-2 ring-white",
        revealed && isCorrect && "border-green bg-status-submitted text-black",
        revealed &&
          isWrongSelection &&
          "border-status-overdue-foreground bg-status-overdue text-black",
        revealed &&
          !isCorrect &&
          !isWrongSelection &&
          "cursor-default border-gray-300 bg-white text-gray-600",
        revealed && "cursor-default",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm border-2",
          revealed && isCorrect && "border-green bg-green text-white",
          revealed &&
            isWrongSelection &&
            "border-status-overdue-foreground bg-status-overdue-foreground text-white",
          !revealed && selected && "border-blue-500 bg-white",
          !revealed && !selected && "border-gray-400 bg-white",
          revealed &&
            !isCorrect &&
            !isWrongSelection &&
            "border-gray-400 bg-white",
        )}
        aria-hidden
      >
        {revealed && isCorrect ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : revealed && isWrongSelection ? (
          <X className="size-3.5" strokeWidth={3} />
        ) : selected && !revealed ? (
          <Check className="size-3.5 text-blue-500" strokeWidth={3} />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{letter}.</span> {text}
      </span>
    </button>
  );
}

export function AssignmentSubmissionCard({
  assignment,
  submission = null,
  onSubmitted,
  className,
}) {
  const initiallySubmitted = Boolean(
    submission?.submittedAt || submission?.status === "submitted",
  );
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

  // Reset local state when navigating between assignments (or server props change).
  useEffect(() => {
    const submitted = Boolean(
      submission?.submittedAt || submission?.status === "submitted",
    );
    setDraft(submission?.content ?? "");
    setFile(null);
    setClearedFile(false);
    setIsEditing(!submitted);
    setIsSubmitting(false);
    setError("");
    setSaved({
      content: submission?.content ?? "",
      submittedAt: submission?.submittedAt ?? null,
      status: submission?.status ?? null,
      answerText: assignment.answerText ?? "",
      correctChoice: assignment.correctChoice ?? "",
    });
  }, [
    assignment.id,
    assignment.answerText,
    assignment.correctChoice,
    submission?.content,
    submission?.status,
    submission?.submittedAt,
  ]);

  const hasSubmitted = Boolean(saved.submittedAt || saved.status === "submitted");
  const showInput = !hasSubmitted || isEditing;
  const type = assignment.submissionType;
  const fieldErrorId = `assignment-${type}-${assignment.id}-error`;
  const canSubmit =
    type === "file"
      ? Boolean(file || (!clearedFile && saved.content))
      : Boolean(String(draft ?? "").trim());

  const choiceRevealed = type === "choice" && hasSubmitted && !isEditing;
  const isChoiceCorrect =
    choiceRevealed && choiceAnswersMatch(saved.content, saved.correctChoice);

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
    <article className={cn("rounded-2xl bg-blue-100 p-6 sm:p-7", className)}>
      <header className="flex items-start justify-between gap-4">
        <h2 className="text-headline3 font-medium text-black">Assignment</h2>
        <StatusBadge status={hasSubmitted ? "submitted" : "pending"} />
      </header>

      {assignment.title ? (
        <p className="mt-4 text-body2 font-medium text-black">{assignment.title}</p>
      ) : null}
      {assignment.description ? (
        <p className="mt-2 whitespace-pre-wrap text-body2 text-gray-700">
          {assignment.description}
        </p>
      ) : null}

      {showInput ? (
        <form className="mt-4" onSubmit={handleSubmit}>
          {type === "text" ? (
            <div className="space-y-2">
              <label htmlFor={`assignment-text-${assignment.id}`} className="sr-only">
                Your answer
              </label>
              <textarea
                id={`assignment-text-${assignment.id}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your answer here..."
                rows={5}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  error ? fieldErrorId : `assignment-text-hint-${assignment.id}`
                }
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-body2 text-black outline-none placeholder:text-gray-500 focus-visible:border-blue-500 focus-visible:shadow-focus"
              />
              <p
                id={`assignment-text-hint-${assignment.id}`}
                className="text-body4 text-gray-600"
              >
                After you submit, you can compare with the suggested answer.
              </p>
            </div>
          ) : null}

          {type === "url" ? (
            <input
              type="url"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="https://"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? fieldErrorId : undefined}
              className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-body2 text-black outline-none placeholder:text-gray-500 focus-visible:border-blue-500 focus-visible:shadow-focus"
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
              <legend className="text-body3 text-gray-700">
                Select all that apply.
              </legend>
              {CHOICE_LETTERS.map((letter) => (
                <ChoiceOption
                  key={letter}
                  letter={letter}
                  text={choiceText(assignment, letter)}
                  selected={parseChoiceLetters(draft).includes(letter)}
                  revealed={false}
                  isCorrect={false}
                  isWrongSelection={false}
                  disabled={isSubmitting}
                  onSelect={(nextLetter) =>
                    setDraft((current) =>
                      toggleChoiceLetter(current, nextLetter),
                    )
                  }
                />
              ))}
            </fieldset>
          ) : null}

          {type !== "file" ? <FieldError id={fieldErrorId} message={error} /> : null}

          <div className="mt-6">
            <Button type="submit" size="sm" className="min-h-12 px-6" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "Submitting..." : "Send Assignment"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          {type === "text" ? (
            <>
              <section className="rounded-lg border border-gray-300 bg-white px-4 py-3">
                <h3 className="text-body3 font-medium text-black">Your answer</h3>
                <p className="mt-2 whitespace-pre-wrap text-body2 text-gray-700">
                  {saved.content}
                </p>
              </section>
              {saved.answerText ? (
                <section className="rounded-lg border border-green bg-status-submitted px-4 py-3">
                  <h3 className="text-body3 font-medium text-status-submitted-foreground">
                    Suggested answer
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-body2 text-black">
                    {saved.answerText}
                  </p>
                </section>
              ) : null}
            </>
          ) : null}

          {type === "choice" ? (
            <>
              <p
                className={cn(
                  "text-body3 font-medium",
                  isChoiceCorrect
                    ? "text-status-submitted-foreground"
                    : "text-status-overdue-foreground",
                )}
                role="status"
              >
                {isChoiceCorrect
                  ? "Correct"
                  : saved.correctChoice
                    ? `Incorrect · ${formatCorrectChoiceLabel(saved.correctChoice)}`
                    : "Submitted"}
              </p>
              <div className="space-y-3">
                {CHOICE_LETTERS.map((letter) => {
                  const isCorrect = parseChoiceLetters(
                    saved.correctChoice,
                  ).includes(letter);
                  const isWrongSelection =
                    parseChoiceLetters(saved.content).includes(letter) &&
                    !isCorrect;
                  return (
                    <ChoiceOption
                      key={letter}
                      letter={letter}
                      text={choiceText(assignment, letter)}
                      selected={parseChoiceLetters(saved.content).includes(
                        letter,
                      )}
                      revealed
                      isCorrect={isCorrect}
                      isWrongSelection={isWrongSelection}
                      disabled
                      onSelect={() => {}}
                    />
                  );
                })}
              </div>
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

          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            Answer again
          </Button>
        </div>
      )}
    </article>
  );
}
