"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "courseflow.add-course-draft";

const INITIAL_DRAFT = {
  promoEnabled: true,
  discountType: "thb",
  promo: {
    code: "NEWYEAR200",
    minPurchase: "0",
    discountThb: "200",
    discountPercent: "",
  },
  values: {
    courseName: "",
    courseCode: "",
    tag: "development",
    price: "",
    learningTime: "",
    courseSummary: "",
    courseDetail: "",
  },
  coverImage: null,
  videoTrailer: null,
  attachment: null,
  lessons: [],
};

const AddCourseDraftContent = createContext(null);

function lessonCount(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function toSerializable(draft) {
  return {
    promoEnabled: draft.promoEnabled,
    discountType: draft.discountType,
    promo: draft.promo,
    values: draft.values,
    lessons: (draft.lessons ?? []).map((lesson) => ({
      id: lesson.id,
      name: lesson.name,
      subLessons: Array.isArray(lesson.subLessons)
        ? lesson.subLessons
        : lessonCount(lesson.subLessons),
    })),
  };
}

function writeDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSerializable(draft)));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function readDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      promoEnabled: parsed.promoEnabled ?? INITIAL_DRAFT.promoEnabled,
      discountType: parsed.discountType ?? INITIAL_DRAFT.discountType,
      promo: { ...INITIAL_DRAFT.promo, ...parsed.promo },
      values: { ...INITIAL_DRAFT.values, ...parsed.values },
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch {
    return null;
  }
}

function clearStoredDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function AddCourseDraftProvider({ children }) {
  const [draft, setDraftState] = useState(INITIAL_DRAFT);

  useEffect(() => {
    const stored = readDraft();
    if (!stored) return;
    setDraftState((current) => ({
      ...current,
      ...stored,
      coverImage: current.coverImage,
      videoTrailer: current.videoTrailer,
      attachment: current.attachment,
    }));
  }, []);

  const setDraft = useCallback((updater) => {
    setDraftState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      writeDraft(next);
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    clearStoredDraft();
    setDraftState(INITIAL_DRAFT);
  }, []);

  const addLesson = useCallback((lesson) => {
    setDraft((current) => ({
      ...current,
      lessons: [
        ...current.lessons,
        {
          id: lesson.id || `draft-lesson-${Date.now()}`,
          name: lesson.name,
          subLessons: lesson.subLessons ?? [],
        },
      ],
    }));
  }, [setDraft]);

  const updateLesson = useCallback((lessonId, updatedLesson) => {
    setDraft((current) => ({
      ...current,
      lessons: (current.lessons ?? []).map((l) =>
        String(l.id) === String(lessonId)
          ? {
              ...l,
              id: lessonId,
              name: updatedLesson.name,
              subLessons: updatedLesson.subLessons ?? [],
            }
          : l,
      ),
    }));
  }, [setDraft]);

  const deleteLesson = useCallback((lessonId) => {
    setDraft((current) => ({
      ...current,
      lessons: (current.lessons ?? []).map((l) => l).filter(
        (l) => String(l.id) !== String(lessonId),
      ),
    }));
  }, [setDraft]);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      clearDraft,
      addLesson,
      updateLesson,
      deleteLesson,
    }),
    [draft, setDraft, clearDraft, addLesson, updateLesson, deleteLesson],
  );

  return (
    <AddCourseDraftContent.Provider value={value}>
      {children}
    </AddCourseDraftContent.Provider>
  );
}

function useAddCourseDraft() {
  return useContext(AddCourseDraftContent);
}

export { AddCourseDraftProvider, useAddCourseDraft, INITIAL_DRAFT };
