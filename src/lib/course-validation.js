import { PROMO_CODE_PATTERN } from "@/lib/promo-codes";

export const COURSE_LIMITS = {
  title: 50,
  summary: 200,
  description: 400,
  courseCode: 32,
};

export const COURSE_TAG_OPTIONS = [
  { slug: "development", name: "Development" },
  { slug: "marketing", name: "Marketing" },
  { slug: "business", name: "Business" },
];

export const COURSE_TAG_SLUGS = COURSE_TAG_OPTIONS.map((tag) => tag.slug);
export const DEFAULT_COURSE_TAG = "development";

export const EMPTY_FIELD_MESSAGE = "Please fill out this field";
export const COURSE_CODE_TAKEN_MESSAGE = "Course code already exists.";
export const COURSE_CODE_PATTERN = /^[a-z0-9]+$/i;
export const INVALID_COURSE_TAG_MESSAGE = "Please select a valid course tag";

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

/** Trim only — keeps the user's casing for display/storage (e.g. LOL404). */
export function trimCourseCode(value) {
  return String(value ?? "").trim();
}

/** Lowercase form used only for uniqueness checks (LOL404 === lol404). */
export function normalizeCourseCode(value) {
  return trimCourseCode(value).toLowerCase();
}

export function isUniqueViolation(error) {
  return error?.code === "23505";
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
export function normalizeCourseTag(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidCourseTag(value) {
  return COURSE_TAG_SLUGS.includes(normalizeCourseTag(value));
}

/**
 * Resolve a course tag slug to its row id.
 * @returns {Promise<string | null>}
 */
export async function resolveCourseTagId(supabase, tagSlug) {
  const slug = normalizeCourseTag(tagSlug);
  if (!isValidCourseTag(slug)) return null;

  const { data, error } = await supabase
    .from("course_tags")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export function validateCourseFields({
  courseName,
  courseCode,
  price,
  learningTime,
  courseSummary,
  courseDetail,
  tag,
}) {
  const errors = {};

  if (isBlank(courseName)) {
    errors.courseName = EMPTY_FIELD_MESSAGE;
  } else if (String(courseName).trim().length > COURSE_LIMITS.title) {
    errors.courseName = `Course name cannot exceed ${COURSE_LIMITS.title} characters`;
  }

  // Empty or whitespace-only is invalid (add + edit). Casing is preserved.
  const trimmedCode = trimCourseCode(courseCode);
  if (!trimmedCode) {
    errors.courseCode = EMPTY_FIELD_MESSAGE;
  } else if (!COURSE_CODE_PATTERN.test(trimmedCode)) {
    errors.courseCode =
      "Course code must contain alphabet and number characters only.";
  } else if (trimmedCode.length > COURSE_LIMITS.courseCode) {
    errors.courseCode = `Course code cannot exceed ${COURSE_LIMITS.courseCode} characters`;
  }

  if (isBlank(tag)) {
    errors.tag = EMPTY_FIELD_MESSAGE;
  } else if (!isValidCourseTag(tag)) {
    errors.tag = INVALID_COURSE_TAG_MESSAGE;
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

/**
 * Find another course that already uses this code (case-insensitive).
 * @returns {Promise<{ id: string } | null>}
 */
export async function findCourseWithCode(
  supabase,
  courseCode,
  { excludeId } = {},
) {
  const normalized = normalizeCourseCode(courseCode);
  if (!normalized) return null;

  let query = supabase
    .from("courses")
    .select("id, course_code")
    .ilike("course_code", normalized)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data?.id) return null;

  // Defense in depth: confirm lower() match (ilike treats _/% as wildcards).
  if (normalizeCourseCode(data.course_code) !== normalized) return null;
  return { id: data.id };
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

/** UI uses `thb`; the promo_codes check constraint stores `fixed`. */
export function mapDiscountTypeForDb(value) {
  const type = String(value ?? "").trim().toLowerCase();
  return type === "thb" ? "fixed" : type;
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
  minPurchaseAmount = "0",
  price,
}) {
  if (!enabled) return {};

  const errors = {};

  if (isBlank(code)) {
    errors.promoCode = EMPTY_FIELD_MESSAGE;
  } else if (!PROMO_CODE_PATTERN.test(String(code).trim())) {
    errors.promoCode =
      "Promo code must contain alphabet and number characters only.";
  }

  if (isBlank(minPurchaseAmount)) {
    errors.minPurchase = EMPTY_FIELD_MESSAGE;
  } else {
    const minPurchaseNumber = asNumber(minPurchaseAmount);
    if (
      !Number.isFinite(minPurchaseNumber) ||
      !Number.isInteger(minPurchaseNumber) ||
      minPurchaseNumber < 0
    ) {
      errors.minPurchase =
        "Minimum purchase amount must be a non-negative number.";
    }
  }

  if (isBlank(discountValue)) {
    errors.discountValue = EMPTY_FIELD_MESSAGE;
  } else {
    const discountNumber = asNumber(discountValue);
    if (!Number.isFinite(discountNumber) || !Number.isInteger(discountNumber)) {
      errors.discountValue = "Discount value must be a non-negative number.";
    } else if (discountNumber < 0) {
      errors.discountValue = "Discount cannot be negative";
    } else if (String(discountType) === "percent" && discountNumber > 100) {
      errors.discountValue = "Percent discount cannot exceed 100.";
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
