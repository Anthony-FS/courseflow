export const COURSE_LIMITS = {
  title: 50,
  summary: 200,
  description: 400,
};

export const EMPTY_FIELD_MESSAGE = "Please fill out this field";

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

function asNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return NaN;

  // Reject values that are not plain numbers (e.g. "12abc")
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return NaN;

  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Validate Add Course text/number fields (not files).
 * @returns {Record<string, string>} map of field key → error message
 */
export function validateCourseFields({
  courseName,
  price,
  learningTime,
  courseSummary,
  courseDetail,
}) {
  const errors = {};

  if (isBlank(courseName)) {
    errors.courseName = EMPTY_FIELD_MESSAGE;
  } else if (String(courseName).trim().length > COURSE_LIMITS.title) {
    errors.courseName = `Course name cannot exceed ${COURSE_LIMITS.title} characters`;
  }

  if (isBlank(price)) {
    errors.price = EMPTY_FIELD_MESSAGE;
  } else {
    const priceNumber = asNumber(price);
    if (!Number.isFinite(priceNumber)) {
      errors.price = "Price must be a number";
    } else if (priceNumber < 0) {
      errors.price = "Price cannot be negative";
    }
  }

  if (isBlank(learningTime)) {
    errors.learningTime = EMPTY_FIELD_MESSAGE;
  } else {
    const learningTimeNumber = asNumber(learningTime);
    if (!Number.isFinite(learningTimeNumber)) {
      errors.learningTime = "Total learning time must be a number";
    } else if (learningTimeNumber <= 0) {
      errors.learningTime = "Total learning time must be greater than 0";
    }
  }

  if (isBlank(courseSummary)) {
    errors.courseSummary = EMPTY_FIELD_MESSAGE;
  } else if (String(courseSummary).trim().length > COURSE_LIMITS.summary) {
    errors.courseSummary = `Course summary cannot exceed ${COURSE_LIMITS.summary} characters`;
  }

  if (isBlank(courseDetail)) {
    errors.courseDetail = EMPTY_FIELD_MESSAGE;
  } else if (String(courseDetail).trim().length > COURSE_LIMITS.description) {
    errors.courseDetail = `Course detail cannot exceed ${COURSE_LIMITS.description} characters`;
  }

  return errors;
}

export function parseCoursePrice(price) {
  return asNumber(price);
}

export function parseLearningTime(learningTime) {
  return asNumber(learningTime);
}

export function isFreePrice(price) {
  const n = asNumber(price);
  return Number.isFinite(n) && n === 0;
}

/**
 * Validate promo fields when promo is enabled.
 * @returns {Record<string, string>} map of field key → error message
 */
export function validatePromoFields({
  enabled,
  code,
  discountType,
  discountValue,
  price,
}) {
  if (!enabled) return {};

  const errors = {};

  if (isBlank(code)) {
    errors.promoCode = EMPTY_FIELD_MESSAGE;
  }

  if (isBlank(discountValue)) {
    errors.discountValue = EMPTY_FIELD_MESSAGE;
  } else {
    const discountNumber = asNumber(discountValue);
    if (!Number.isFinite(discountNumber)) {
      errors.discountValue = "Discount must be a number";
    } else if (discountNumber < 0) {
      errors.discountValue = "Discount cannot be negative";
    } else if (String(discountType) === "thb") {
      const priceNumber = asNumber(price);
      if (Number.isFinite(priceNumber) && discountNumber > priceNumber) {
        errors.discountValue =
          "Discount (THB) cannot exceed course price";
      }
    }
  }

  return errors;
}
