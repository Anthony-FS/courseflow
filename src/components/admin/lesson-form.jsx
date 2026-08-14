"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, X, Play } from "lucide-react";
import ConfirmationModal from "./confirmation-modal";

export default function LessonForm({
  mode = "add", // 'add' | 'edit'
  courseTitle = "Service Design Essentials",
  initialData = null,
  onSave,
}) {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id || "1";

  // Form State
  const [lessonName, setLessonName] = useState(initialData?.name || "");

  const [subLessons, setSubLessons] = useState(
    initialData?.subLessons || [
      {
        id: Date.now(),
        title: "",
        videoUrl: null,
        videoFile: null,
        videoName: "",
      },
    ]
  );

  const [errors, setErrors] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sub-lesson Handlers
  const handleAddSubLesson = () => {
    setSubLessons([
      ...subLessons,
      {
        id: Date.now() + Math.random(),
        title: "",
        videoUrl: null,
        videoFile: null,
        videoName: "",
      },
    ]);
  };

  const handleRemoveSubLesson = (indexToRemove) => {
    if (subLessons.length <= 1) return;
    setSubLessons(subLessons.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubLessonTitleChange = (index, value) => {
    const updated = [...subLessons];
    updated[index].title = value;
    setSubLessons(updated);
  };

  const handleVideoUpload = (index, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const updated = [...subLessons];
    updated[index].videoFile = file;
    updated[index].videoUrl = url;
    updated[index].videoName = file.name;
    setSubLessons(updated);
  };

  const handleRemoveVideo = (index) => {
    const updated = [...subLessons];
    updated[index].videoFile = null;
    updated[index].videoUrl = null;
    updated[index].videoName = "";
    setSubLessons(updated);
  };

  // Form Validation & Submit
  const handleSubmit = (e) => {
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

    const payload = {
      lessonName,
      subLessons,
    };

    if (onSave) {
      onSave(payload);
    } else {
      router.push(`/admin/courses/${courseId}`);
    }
  };

  const handleDeleteLessonConfirm = () => {
    setIsDeleteModalOpen(false);
    router.push(`/admin/courses/${courseId}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F6F7FC]">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-[#E4E6ED] px-10 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
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
            onClick={() => router.back()}
            className="min-w-[110px] px-7 py-2.5 rounded-xl border border-[#F47E20] text-[#F47E20] font-bold text-base hover:bg-[#FFF7F0] active:scale-[0.98] transition-all cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="min-w-[110px] px-7 py-2.5 rounded-xl bg-[#2F5FAC] hover:bg-[#234781] active:scale-[0.98] text-white font-bold text-base transition-all cursor-pointer"
          >
            {mode === "add" ? "Create" : "Edit"}
          </button>
        </div>
      </header>

      {/* Main Content Body (Exact Match with Image 2) */}
      <div className="flex-1 p-8 sm:p-10 max-w-5xl w-full mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#E4E6ED] p-8 sm:p-10 space-y-8"
        >
          {/* Lesson Name Field */}
          <div>
            <label className="block text-sm font-medium text-[#2A2E3F] mb-2">
              Lesson name *
            </label>
            <input
              type="text"
              value={lessonName}
              onChange={(e) => {
                setLessonName(e.target.value);
                if (errors.lessonName) setErrors({ ...errors, lessonName: null });
              }}
              className={`w-full h-12 px-4 bg-white rounded-lg border ${
                errors.lessonName ? "border-[#9B2C6B]" : "border-[#D6D9E4]"
              } focus:border-[#FBAA1C] focus:shadow-[0_0_0_3px_rgba(251,170,28,0.28)] outline-none transition-all text-sm text-[#2A2E3F]`}
            />
            {errors.lessonName && (
              <p className="text-xs text-[#9B2C6B] mt-1.5">{errors.lessonName}</p>
            )}
          </div>

          <hr className="border-t border-[#E4E6ED] my-8" />

          {/* Sub-Lesson Section */}
          <div>
            <h2 className="text-base font-bold text-[#646D89] mb-6">Sub-Lesson</h2>

            {/* Sub-lesson Cards List */}
            <div className="space-y-6">
              {subLessons.map((sub, index) => (
                <div
                  key={sub.id}
                  className="bg-[#F8F9FD] border border-[#E4E6ED] rounded-2xl p-6 sm:p-8 relative"
                >
                  <div className="flex items-start gap-4">
                    {/* 6-dot drag icon */}
                    <div className="pt-2 text-[#C8CCDB] cursor-grab select-none shrink-0">
                      <svg
                        width="12"
                        height="18"
                        viewBox="0 0 12 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="3" cy="3" r="1.5" fill="#C8CCDB" />
                        <circle cx="9" cy="3" r="1.5" fill="#C8CCDB" />
                        <circle cx="3" cy="9" r="1.5" fill="#C8CCDB" />
                        <circle cx="9" cy="9" r="1.5" fill="#C8CCDB" />
                        <circle cx="3" cy="15" r="1.5" fill="#C8CCDB" />
                        <circle cx="9" cy="15" r="1.5" fill="#C8CCDB" />
                      </svg>
                    </div>

                    {/* Sub-Lesson Inputs */}
                    <div className="flex-1">
                      {/* Top Row: Label & Delete Button */}
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-[#2A2E3F]">
                          Sub-lesson name *
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubLesson(index)}
                          disabled={subLessons.length <= 1}
                          className={`text-sm font-semibold transition-colors ${
                            subLessons.length <= 1
                              ? "text-[#C8CCDB] cursor-not-allowed"
                              : "text-[#9AA1B9] hover:text-[#F47E20] cursor-pointer"
                          }`}
                        >
                          Delete
                        </button>
                      </div>

                      {/* Sub-lesson Name Input (max-w-md to match screenshot) */}
                      <div className="max-w-[420px]">
                        <input
                          type="text"
                          value={sub.title}
                          onChange={(e) => {
                            handleSubLessonTitleChange(index, e.target.value);
                            if (errors[`subLessonTitle_${index}`]) {
                              setErrors({ ...errors, [`subLessonTitle_${index}`]: null });
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

                      {/* Video Upload Section */}
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-[#2A2E3F] mb-3">
                          Video *
                        </label>

                        {sub.videoUrl ? (
                          /* Video Preview Thumbnail */
                          <div className="relative w-36 h-36 bg-black rounded-2xl overflow-hidden group border border-[#D6D9E4] flex items-center justify-center shadow-xs">
                            <video
                              src={sub.videoUrl}
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                <Play className="w-5 h-5 text-[#2F5FAC] fill-[#2F5FAC] ml-0.5" />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVideo(index)}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F47E20] text-white flex items-center justify-center hover:bg-[#d66b16] transition-colors shadow-xs"
                              title="Remove Video"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          /* Upload Video Box (Exact Match with Image 2) */
                          <label className="w-36 h-36 rounded-2xl bg-[#EEF1F7] hover:bg-[#E2E8F5] flex flex-col items-center justify-center cursor-pointer transition-colors group">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => handleVideoUpload(index, e.target.files[0])}
                            />
                            <Plus className="w-6 h-6 text-[#2F5FAC] stroke-[2.5]" />
                            <span className="text-xs font-semibold text-[#2F5FAC] mt-2">
                              Upload Video
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteLessonConfirm}
        title="Confirmation"
        message="Are you sure you want to delete this lesson?"
        confirmText="Yes, I want to delete this lesson"
        cancelText="No, keep it"
      />
    </div>
  );
}
