"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

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

function AddCourseDraftProvider({ children }) {
  const [draft, setDraft] = useState(INITIAL_DRAFT);

  const clearDraft = useCallback(() => {
    setDraft(INITIAL_DRAFT);
  }, []);

  const addLesson = useCallback((lesson) => {
    setDraft((current) => ({
      ...current,
      lessons: [...current.lessons, lesson],
    }));
  }, []);

  const value = useMemo(
    () => ({ draft, setDraft, clearDraft, addLesson }),
    [draft, clearDraft, addLesson],
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
