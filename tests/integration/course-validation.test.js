import { describe, expect, it } from "vitest";

import {
  COURSE_CODE_TAKEN_MESSAGE,
  COURSE_LIMITS,
  isFreePrice,
  normalizeCourseCode,
  trimCourseCode,
  validateCourseFields,
  validatePromoFields,
} from "@/lib/course-validation";

describe("course field validation", () => {
  const valid = {
    courseName: "Service Design",
    courseCode: "SD101",
    tag: "development",
    price: "100",
    learningTime: "12",
    courseSummary: "A short summary",
    courseDetail: "A longer detail section",
  };

  it("accepts valid course fields", () => {
    expect(validateCourseFields(valid)).toEqual({});
  });

  it("trims course codes but preserves casing for storage", () => {
    expect(trimCourseCode(" LOL404 ")).toBe("LOL404");
    expect(trimCourseCode("lol404")).toBe("lol404");
  });

  it("normalizes course codes to lowercase only for uniqueness checks", () => {
    expect(normalizeCourseCode("LOL404")).toBe("lol404");
    expect(normalizeCourseCode(" lol404 ")).toBe("lol404");
    expect(normalizeCourseCode("LOL404")).toBe(normalizeCourseCode("lol404"));
  });

  it("rejects an empty course code", () => {
    expect(validateCourseFields({ ...valid, courseCode: "" }).courseCode).toBe(
      "Please fill out this field",
    );
  });

  it("rejects an empty course tag", () => {
    expect(validateCourseFields({ ...valid, tag: "" }).tag).toBe(
      "Please fill out this field",
    );
  });

  it("does not reject a tag slug that is not in the hardcoded list", () => {
    expect(validateCourseFields({ ...valid, tag: "design" })).toEqual({});
  });

  it("rejects a whitespace-only course code", () => {
    expect(
      validateCourseFields({ ...valid, courseCode: "   " }).courseCode,
    ).toBe("Please fill out this field");
    expect(
      validateCourseFields({ ...valid, courseCode: "\t\n" }).courseCode,
    ).toBe("Please fill out this field");
  });

  it("rejects course codes with non-alphanumeric characters", () => {
    expect(
      validateCourseFields({ ...valid, courseCode: "FSD-12" }).courseCode,
    ).toMatch(/alphabet and number/i);
  });

  it("rejects course name over 50 characters", () => {
    const errors = validateCourseFields({
      ...valid,
      courseName: "a".repeat(COURSE_LIMITS.title + 1),
    });
    expect(errors.courseName).toMatch(/cannot exceed 50 characters/i);
  });

  it("rejects non-numeric and negative prices", () => {
    expect(validateCourseFields({ ...valid, price: "abc" }).price).toMatch(
      /must be a number/i,
    );
    expect(validateCourseFields({ ...valid, price: "-1" }).price).toMatch(
      /cannot be negative/i,
    );
  });

  it("treats price 0 as Free", () => {
    expect(isFreePrice("0")).toBe(true);
    expect(isFreePrice(0)).toBe(true);
    expect(isFreePrice("10")).toBe(false);
    expect(validateCourseFields({ ...valid, price: "0" })).toEqual({});
  });

  it("rejects learning time that is not a number or <= 0", () => {
    expect(
      validateCourseFields({ ...valid, learningTime: "two hours" }).learningTime,
    ).toMatch(/must be a number/i);
    expect(
      validateCourseFields({ ...valid, learningTime: "0" }).learningTime,
    ).toMatch(/greater than 0/i);
    expect(
      validateCourseFields({ ...valid, learningTime: "-3" }).learningTime,
    ).toMatch(/greater than 0/i);
  });

  it("rejects summary over 200 and detail over 400 characters", () => {
    expect(
      validateCourseFields({
        ...valid,
        courseSummary: "s".repeat(COURSE_LIMITS.summary + 1),
      }).courseSummary,
    ).toMatch(/cannot exceed 200 characters/i);

    expect(
      validateCourseFields({
        ...valid,
        courseDetail: "d".repeat(COURSE_LIMITS.description + 1),
      }).courseDetail,
    ).toMatch(/cannot exceed 400 characters/i);
  });
});

describe("promo field validation", () => {
  it("skips validation when promo is disabled", () => {
    expect(
      validatePromoFields({
        enabled: false,
        code: "",
        discountType: "thb",
        discountValue: "9999",
        price: "100",
      }),
    ).toEqual({});
  });

  it("rejects THB discount greater than course price", () => {
    const errors = validatePromoFields({
      enabled: true,
      code: "SAVE200",
      discountType: "thb",
      discountValue: "201",
      price: "200",
    });
    expect(errors.discountValue).toMatch(/cannot exceed course price/i);
  });

  it("allows THB discount equal to course price", () => {
    expect(
      validatePromoFields({
        enabled: true,
        code: "SAVE200",
        discountType: "thb",
        discountValue: "200",
        price: "200",
      }),
    ).toEqual({});
  });

  it("does not apply price cap to percent discounts", () => {
    expect(
      validatePromoFields({
        enabled: true,
        code: "SAVE50",
        discountType: "percent",
        discountValue: "50",
        price: "100",
      }),
    ).toEqual({});
  });

  it("rejects promo codes with non-alphanumeric characters", () => {
    expect(
      validatePromoFields({
        enabled: true,
        code: "SAVE-50",
        discountType: "percent",
        discountValue: "50",
        price: "100",
      }).promoCode,
    ).toMatch(/alphabet and number/i);
  });

  it("rejects percent discounts over 100", () => {
    expect(
      validatePromoFields({
        enabled: true,
        code: "SAVE50",
        discountType: "percent",
        discountValue: "101",
        price: "100",
      }).discountValue,
    ).toMatch(/cannot exceed 100/i);
  });
});

describe("course code taken message", () => {
  it("exports a stable duplicate message", () => {
    expect(COURSE_CODE_TAKEN_MESSAGE).toMatch(/already exists/i);
  });
});
