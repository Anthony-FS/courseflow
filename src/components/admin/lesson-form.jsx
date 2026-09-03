"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import { useAddCourseDraft } from "@/components/admin/add-course-draft-content";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SubLessonBlockBuilder } from "@/components/admin/sub-lesson-block-builder";
import {
  uploadAdminFile,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
  getAdminLessonDetail,
} from "@/lib/admin-courses";
import {
  BLOCK_TYPES,
  hasAttachmentContentBlock,
  hasVideoContentBlock,
  hydrateSubLessonBlocks,
  migrateLegacyAttachmentIntoBlocks,
  migrateLegacyVideoIntoBlocks,
  parseSubLessonContent,
  serializeSubLessonContent,
} from "@/lib/sub-lesson-blocks";
import { cn } from "@/lib/utils";

function remapSubLessonTitleErrors(errors, fromIndex, toIndex) {
  if (fromIndex === toIndex) return errors;

  const next = { ...errors };
  const movedKey = `subLessonTitle_${fromIndex}`;
  const movedMessage = next[movedKey];

  const indexes = Object.keys(next)
    .map((key) => {
      const match = key.match(/^subLessonTitle_(\d+)$/);
      return match ? Number(match[1]) : null;
    })
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  const maxIndex = Math.max(
    fromIndex,
    toIndex,
    ...(indexes.length ? indexes : [0]),
  );
  const messages = Array.from({ length: maxIndex + 1 }, (_, index) => {
    return next[`subLessonTitle_${index}`] ?? null;
  });

  const [moved] = messages.splice(fromIndex, 1);
  messages.splice(toIndex, 0, moved ?? movedMessage ?? null);

  for (const key of Object.keys(next)) {
    if (key.startsWith("subLessonTitle_")) {
      delete next[key];
    }
  }

  messages.forEach((message, index) => {
    if (message) {
      next[`subLessonTitle_${index}`] = message;
    }
  });

  return next;
}

function hydrateSubLessons(subLessons) {
  if (!Array.isArray(subLessons) || subLessons.length === 0) {
    return subLessons;
  }
  return subLessons.map((sub) => hydrateSubLessonBlocks(sub));
}

export default function LessonForm({
  mode = "add", // 'add' | 'edit'
  courseTitle = "Service Design Essentials",
  initialData = null,
  onSave,
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const draftContent = useAddCourseDraft();
  const isNewCourseFlow = pathname?.startsWith("/admin/courses/new");
  const courseId = isNewCourseFlow ? "new" : params?.id;
  const lessonId = params?.lessonId;

  // Form State
  const [lessonName, setLessonName] = useState(initialData?.name || "");
  const [subLessons, setSubLessons] = useState(
    () =>
      hydrateSubLessons(initialData?.subLessons) || [
        {
          id: "sub-initial-1",
          title: "",
          description: "",
          videoUrl: null,
          videoFile: null,
          videoName: "",
          attachmentUrl: null,
          attachmentFile: null,
          attachmentName: "",
        },
      ],
  );

  const [errors, setErrors] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const allowDragRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isDragging = dragIndex !== null;

  function leaveForm() {
    if (isNewCourseFlow) {
      router.push("/admin/courses/new");
      return;
    }
    if (courseId && courseId !== "new") {
      router.push(`/admin/courses/${courseId}/edit`);
      return;
    }
    router.back();
  }

  useEffect(() => {
    function clearAllowDrag() {
      if (!isDraggingRef.current) {
        allowDragRef.current = false;
      }
    }

    window.addEventListener("mouseup", clearAllowDrag);
    window.addEventListener("touchend", clearAllowDrag);
    return () => {
      window.removeEventListener("mouseup", clearAllowDrag);
      window.removeEventListener("touchend", clearAllowDrag);
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load lesson detail in edit mode
  useEffect(() => {
    if (mode !== "edit") return;

    if (initialData) {
      setLessonName(initialData.name || initialData.title || "");
      if (
        Array.isArray(initialData.subLessons) &&
        initialData.subLessons.length > 0
      ) {
        setSubLessons(hydrateSubLessons(initialData.subLessons));
      }
      return;
    }

    if (isNewCourseFlow) {
      const found = draftContent?.draft?.lessons?.find(
        (l) => String(l.id) === String(lessonId),
      );
      if (found) {
        setLessonName(found.name || found.title || "");
        if (Array.isArray(found.subLessons) && found.subLessons.length > 0) {
          setSubLessons(hydrateSubLessons(found.subLessons));
        }
      }
      return;
    }

    if (courseId && courseId !== "new" && lessonId) {
      let cancelled = false;
      setIsLoading(true);

      getAdminLessonDetail(courseId, lessonId)
        .then((detail) => {
          if (cancelled || !detail) return;
          setLessonName(detail.name || detail.title || "");
          if (
            Array.isArray(detail.subLessons) &&
            detail.subLessons.length > 0
          ) {
            setSubLessons(hydrateSubLessons(detail.subLessons));
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setSubmitError(err.message || "Failed to load lesson details");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }
  }, [mode, initialData, isNewCourseFlow, draftContent, courseId, lessonId]);

  // Sub-lesson Handlers
  const handleAddSubLesson = () => {
    setSubLessons([
      ...subLessons,
      {
        id: Date.now() + Math.random(),
        title: "",
        description: "",
        videoUrl: null,
        videoFile: null,
        videoName: "",
        attachmentUrl: null,
        attachmentFile: null,
        attachmentName: "",
      },
    ]);
  };

  const handleRemoveSubLesson = (indexToRemove) => {
    if (subLessons.length <= 1) return;
    setSubLessons(subLessons.filter((_, idx) => idx !== indexToRemove));
    setErrors((current) => {
      const next = { ...current };
      delete next[`subLessonTitle_${indexToRemove}`];
      const remapped = {};
      for (const [key, value] of Object.entries(next)) {
        const match = key.match(/^subLessonTitle_(\d+)$/);
        if (!match) {
          remapped[key] = value;
          continue;
        }
        const oldIndex = Number(match[1]);
        const newIndex = oldIndex > indexToRemove ? oldIndex - 1 : oldIndex;
        remapped[`subLessonTitle_${newIndex}`] = value;
      }
      return remapped;
    });
  };

  const handleSubLessonTitleChange = (index, value) => {
    const updated = [...subLessons];
    updated[index].title = value;
    setSubLessons(updated);
  };

  const handleSubLessonDescriptionChange = (index, value) => {
    const updated = [...subLessons];
    updated[index].description = value;
    updated[index].blocks = parseSubLessonContent(value);
    setSubLessons(updated);
  };

  const handleSubLessonBlocksChange = (index, newBlocks) => {
    const updated = [...subLessons];
    updated[index].blocks = newBlocks;
    updated[index].description = serializeSubLessonContent(newBlocks);
    setSubLessons(updated);
  };

  function handleDragHandleMouseDown(event) {
    event.stopPropagation();
    allowDragRef.current = true;
  }

  function handleDragStart(event, index) {
    if (!allowDragRef.current) {
      event.preventDefault();
      return;
    }

    allowDragRef.current = false;
    isDraggingRef.current = true;
    const tile = event.currentTarget;
    tile.classList.add("sub-lesson-tile--dragging");
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    const ghost = document.createElement("div");
    ghost.style.cssText =
      "position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => ghost.remove());
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragIndex === null || dragIndex === index) return;

    setSubLessons((current) => {
      const next = [...current];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setErrors((current) =>
      remapSubLessonTitleErrors(current, dragIndex, index),
    );
    setDragIndex(index);
  }

  function handleDragEnd(event) {
    event.currentTarget.classList.remove("sub-lesson-tile--dragging");
    allowDragRef.current = false;
    isDraggingRef.current = false;
    setDragIndex(null);
  }

  // Form Validation & Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!lessonName.trim()) {
      newErrors.lessonName = "Lesson name is required";
    }

    subLessons.forEach((sub, idx) => {
      if (!sub.title.trim()) {
        newErrors[`subLessonTitle_${idx}`] = "Sub-lesson name is required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSubmitError("");

    try {
      // 1. Upload any newly selected video or block media files to Supabase Storage
      const preparedSubLessons = await Promise.all(
        subLessons.map(async (sub) => {
          let finalVideoUrl = sub.videoUrl || null;
          let finalVideoName = sub.videoName || "";

          if (sub.videoFile) {
            const uploadRes = await uploadAdminFile(
              "lessonVideo",
              sub.videoFile,
            );
            finalVideoUrl = uploadRes.fileUrl;
            finalVideoName = uploadRes.name || sub.videoName;
          }

          if (
            typeof finalVideoUrl === "string" &&
            (finalVideoUrl.startsWith("blob:") ||
              finalVideoUrl.startsWith("data:"))
          ) {
            finalVideoUrl = null;
          }

          let processedBlocks = migrateLegacyAttachmentIntoBlocks(
            migrateLegacyVideoIntoBlocks(
              sub.blocks || parseSubLessonContent(sub.description),
              finalVideoUrl,
              finalVideoName,
            ),
            sub.attachmentUrl,
            sub.attachmentName,
            sub.attachmentType,
          );

          if (Array.isArray(processedBlocks) && processedBlocks.length > 0) {
            processedBlocks = await Promise.all(
              processedBlocks.map(async (block) => {
                if (block.type === BLOCK_TYPES.IMAGE && block.file) {
                  const res = await uploadAdminFile("cover", block.file);
                  return { ...block, url: res.fileUrl, file: null };
                }
                if (block.type === BLOCK_TYPES.VIDEO && block.file) {
                  const res = await uploadAdminFile("lessonVideo", block.file);
                  return { ...block, url: res.fileUrl, file: null };
                }
                if (block.type === BLOCK_TYPES.ATTACHMENT && block.file) {
                  const res = await uploadAdminFile("attachment", block.file);
                  return {
                    ...block,
                    url: res.fileUrl,
                    name: block.name || res.name || block.file.name,
                    fileType: block.fileType || block.file.type || "",
                    file: null,
                  };
                }
                const { file, ...rest } = block;
                return rest;
              }),
            );
          }

          const finalDescription = serializeSubLessonContent(processedBlocks);
          const videoIsInBlocks = hasVideoContentBlock(processedBlocks);
          const attachmentIsInBlocks =
            hasAttachmentContentBlock(processedBlocks);

          return {
            title: sub.title.trim(),
            description: finalDescription ? finalDescription.trim() : "",
            videoUrl: videoIsInBlocks ? null : finalVideoUrl,
            videoName: videoIsInBlocks ? "" : finalVideoName,
            attachmentUrl: attachmentIsInBlocks
              ? null
              : sub.attachmentUrl || null,
            attachmentName: attachmentIsInBlocks ? "" : sub.attachmentName || "",
          };
        }),
      );

      const payload = {
        lessonName: lessonName.trim(),
        subLessons: preparedSubLessons,
      };

      if (onSave) {
        await onSave(payload);
      } else if (isNewCourseFlow) {
        if (mode === "add") {
          draftContent?.addLesson?.({
            id: `draft-lesson-${Date.now()}`,
            name: payload.lessonName,
            subLessons: payload.subLessons,
          });
        } else {
          draftContent?.updateLesson?.(lessonId, {
            id: lessonId,
            name: payload.lessonName,
            subLessons: payload.subLessons,
          });
        }
        router.push("/admin/courses/new");
        return;
      } else if (mode === "add") {
        await createAdminLesson(courseId, payload);
      } else {
        await updateAdminLesson(courseId, lessonId, payload);
      }

      if (courseId && courseId !== "new") {
        router.push(`/admin/courses/${courseId}/edit`);
      } else {
        router.push("/admin/courses");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to save lesson");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLessonConfirm = async () => {
    setIsDeleting(true);
    try {
      if (isNewCourseFlow) {
        draftContent?.deleteLesson?.(lessonId);
        setIsDeleteModalOpen(false);
        router.push("/admin/courses/new");
        return;
      }

      if (lessonId) {
        await deleteAdminLesson(courseId, lessonId);
      }
      setIsDeleteModalOpen(false);
      if (courseId && courseId !== "new") {
        router.push(`/admin/courses/${courseId}/edit`);
      } else {
        router.push("/admin/courses");
      }
    } catch (err) {
      alert(err.message || "Failed to delete lesson");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F6F7FC]">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-[#E4E6ED] px-10 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={leaveForm}
            className="text-[#9AA1B9] hover:text-[#2A2E3F] transition-colors p-1 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <p className="text-xs text-[#9AA1B9] font-normal leading-tight">
              Course
            </p>
            <h1 className="text-2xl font-bold text-[#1E2235] tracking-tight mt-0.5">
              {mode === "add" ? "Add Lesson" : "Edit Lesson"}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={leaveForm}
            disabled={isSaving}
            className="min-w-[110px] px-7 py-2.5 rounded-xl border border-[#F47E20] text-[#F47E20] font-bold text-base hover:bg-[#FFF7F0] active:scale-[0.98] transition-all cursor-pointer bg-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isLoading}
            className="min-w-[110px] px-7 py-2.5 rounded-xl bg-[#2F5FAC] hover:bg-[#234781] active:scale-[0.98] text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === "add" ? "Create" : "Edit"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 p-8 sm:p-10 max-w-5xl w-full mx-auto">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#E4E6ED] p-12 flex flex-col items-center justify-center gap-3 text-[#646D89]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2F5FAC]" />
            <p className="text-sm font-medium">Loading lesson details...</p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-[#E4E6ED] p-8 sm:p-10 space-y-8"
            >
              {submitError && (
                <div className="p-4 rounded-xl bg-[#FAE7F4] border border-[#9B2C6B] text-[#9B2C6B] text-sm font-medium">
                  {submitError}
                </div>
              )}

              {/* Lesson Name Field */}
              <div>
                <label className="block text-sm font-medium text-[#2A2E3F] mb-2">
                  Lesson name
                </label>
                <input
                  type="text"
                  value={lessonName}
                  placeholder="e.g. Introduction to Service Design"
                  onChange={(e) => {
                    setLessonName(e.target.value);
                    if (errors.lessonName)
                      setErrors({ ...errors, lessonName: null });
                  }}
                  className={`w-full h-12 px-4 bg-white rounded-lg border ${
                    errors.lessonName ? "border-[#9B2C6B]" : "border-[#D6D9E4]"
                  } focus:border-[#FBAA1C] focus:shadow-[0_0_0_3px_rgba(251,170,28,0.28)] outline-none transition-all text-sm text-[#2A2E3F]`}
                />
                {errors.lessonName && (
                  <p className="text-xs text-[#9B2C6B] mt-1.5">
                    {errors.lessonName}
                  </p>
                )}
              </div>

              <hr className="border-t border-[#E4E6ED] my-8" />

              {/* Sub-Lesson Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-bold text-[#646D89]">
                    Sub-Lessons
                  </h2>
                  <span className="text-xs text-[#9AA1B9] font-medium">
                    {subLessons.length}{" "}
                    {subLessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </div>

                {/* Sub-lesson Cards List */}
                <div
                  className={cn(
                    "space-y-6",
                    isDragging && "relative overflow-visible",
                  )}
                >
                  {subLessons.map((sub, index) => {
                    const isLifted = dragIndex === index;

                    return (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, index)}
                        onDragOver={(event) => handleDragOver(event, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "sub-lesson-tile bg-[#F8F9FD] border border-[#E4E6ED] rounded-2xl p-6 sm:p-8 relative transition-shadow hover:shadow-xs",
                          isDragging && !isLifted && "opacity-70",
                          isLifted && "sub-lesson-tile--dragging",
                        )}
                      >
                        <div className="flex items-start gap-4">
                          {/* 6-dot drag icon — only this handle starts reorder */}
                          <div
                            data-drag-handle
                            onMouseDown={handleDragHandleMouseDown}
                            onTouchStart={handleDragHandleMouseDown}
                            className="pt-2.5 text-[#C8CCDB] hover:text-[#9AA1B9] cursor-grab active:cursor-grabbing select-none shrink-0"
                            aria-label={`Reorder sub-lesson ${index + 1}`}
                          >
                            <svg
                              width="12"
                              height="18"
                              viewBox="0 0 12 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                            >
                              <circle
                                cx="3"
                                cy="3"
                                r="1.5"
                                fill="currentColor"
                              />
                              <circle
                                cx="9"
                                cy="3"
                                r="1.5"
                                fill="currentColor"
                              />
                              <circle
                                cx="3"
                                cy="9"
                                r="1.5"
                                fill="currentColor"
                              />
                              <circle
                                cx="9"
                                cy="9"
                                r="1.5"
                                fill="currentColor"
                              />
                              <circle
                                cx="3"
                                cy="15"
                                r="1.5"
                                fill="currentColor"
                              />
                              <circle
                                cx="9"
                                cy="15"
                                r="1.5"
                                fill="currentColor"
                              />
                            </svg>
                          </div>

                          {/* Sub-Lesson Inputs */}
                          <div className="flex-1 space-y-6">
                            {/* Top Row: Label & Delete Button */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E2E8F5] text-[#2F5FAC] text-xs font-bold">
                                  {index + 1}
                                </span>
                                <label className="block text-sm font-semibold text-[#2A2E3F]">
                                  Sub-lesson name
                                </label>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubLesson(index)}
                                  disabled={subLessons.length <= 1}
                                  className={`text-sm font-semibold transition-colors ${
                                    subLessons.length <= 1
                                      ? "text-[#C8CCDB] cursor-not-allowed"
                                      : "text-[#9AA1B9] hover:text-[#9B2C6B] cursor-pointer"
                                  }`}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Sub-lesson Name Input */}
                            <div>
                              <input
                                type="text"
                                value={sub.title}
                                placeholder="e.g. What is Service Design?"
                                onChange={(e) => {
                                  handleSubLessonTitleChange(
                                    index,
                                    e.target.value,
                                  );
                                  if (errors[`subLessonTitle_${index}`]) {
                                    setErrors({
                                      ...errors,
                                      [`subLessonTitle_${index}`]: null,
                                    });
                                  }
                                }}
                                className={`w-full h-11 px-4 bg-white rounded-lg border ${
                                  errors[`subLessonTitle_${index}`]
                                    ? "border-[#9B2C6B]"
                                    : "border-[#D6D9E4]"
                                } focus:border-[#FBAA1C] focus:shadow-[0_0_0_3px_rgba(251,170,28,0.28)] outline-none transition-all text-sm text-[#2A2E3F]`}
                              />
                              {errors[`subLessonTitle_${index}`] && (
                                <p className="text-xs text-[#9B2C6B] mt-1.5">
                                  {errors[`subLessonTitle_${index}`]}
                                </p>
                              )}
                            </div>

                            {/* Sub-Lesson Content Blocks Builder */}
                            <div>
                              <SubLessonBlockBuilder
                                blocks={
                                  sub.blocks ||
                                  parseSubLessonContent(sub.description)
                                }
                                onChange={(newBlocks) =>
                                  handleSubLessonBlocksChange(index, newBlocks)
                                }
                                subLessonIndex={index}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Sub-Lesson Button */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleAddSubLesson}
                    className="px-6 py-2.5 rounded-xl border border-[#F47E20] text-[#F47E20] font-bold text-sm bg-white hover:bg-[#FFF7F0] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    + Add Sub-lesson
                  </button>
                </div>
              </div>
            </form>

            {/* Delete Lesson Option (Edit Mode Only) */}
            {mode === "edit" && (
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsDeleteModalOpen(true);
                  }}
                  className="text-sm font-semibold text-[#646D89] hover:text-[#9B2C6B] transition-colors cursor-pointer underline decoration-dotted"
                >
                  Delete Lesson
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmationDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteLessonConfirm}
        isConfirming={isDeleting}
        confirmFirst
        message="Are you sure you want to delete this lesson?"
        confirmText="Yes, I want to delete this lesson"
        cancelText="No, keep it"
      />
    </div>
  );
}
