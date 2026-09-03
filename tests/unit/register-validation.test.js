import { afterEach, describe, expect, it, vi } from "vitest";

import {
  latestAdultDobIsoDate,
  validateAll,
  validateField,
} from "@/lib/register-validation";

// ข้อมูล Guest ที่ผ่านทุกช่อง — ใช้เป็นฐานแล้วค่อย override ช่องที่อยากทำให้พัง
const valid = {
  fullName: "Somchai Jaidee",
  dob: "1998-05-12",
  education: "Bachelor of CS",
  email: "somchai@mail.com",
  password: "secret1",
  confirmPassword: "secret1",
};

const empty = {
  fullName: "",
  dob: "",
  education: "",
  email: "",
  password: "",
  confirmPassword: "",
};

describe("register field validation", () => {
  afterEach(() => {
    // คืนเวลาจริงหลังเคสที่ freeze วันที่
    vi.useRealTimers();
  });

  // Happy Path: กรอกครบถ้วนต้องไม่มี error ทุกช่อง
  it("accepts a complete valid guest registration", () => {
    expect(validateAll(valid)).toEqual({
      fullName: "",
      dob: "",
      education: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  });

  // Educational Background เป็นช่องไม่บังคับ
  it("allows empty educational background", () => {
    expect(validateAll({ ...valid, education: "" }).education).toBe("");
    expect(validateField("education", { ...valid, education: "" })).toBe("");
  });

  // กดสมัครโดยไม่กรอก: ช่องบังคับต้องมี error, education ต้องว่าง (ไม่มี error)
  it("rejects an empty form except education", () => {
    const errors = validateAll(empty);

    expect(errors.fullName).toBe("Please enter your name");
    expect(errors.dob).toBe("Please enter your date of birth");
    expect(errors.email).toBe("Please enter your email");
    expect(errors.password).toBe("Please enter a password");
    expect(errors.confirmPassword).toBe("Please confirm your password");
    expect(errors.education).toBe("");
  });

  // Email ต้องเป็นรูปแบบ something@something.something
  it("rejects invalid email formats", () => {
    for (const email of ["abc", "abc@", "@mail.com", "a@b"]) {
      expect(validateAll({ ...valid, email }).email).toBe(
        "Please enter a valid email",
      );
    }
  });

  // Password ต้องยาวอย่างน้อย 6 ตัวอักษร
  it("rejects passwords shorter than 6 characters", () => {
    expect(
      validateAll({ ...valid, password: "12345", confirmPassword: "12345" })
        .password,
    ).toBe("Password must be at least 6 characters");
  });

  it("rejects a missing confirm password", () => {
    expect(validateAll({ ...valid, confirmPassword: "" }).confirmPassword).toBe(
      "Please confirm your password",
    );
  });

  it("rejects confirm password that does not match", () => {
    expect(
      validateAll({ ...valid, confirmPassword: "secret2" }).confirmPassword,
    ).toBe("Passwords do not match");
  });

  // วันเกิดห้ามเป็นวันในอนาคต — freeze วันที่เพื่อไม่ให้เทสพังตามเวลาจริง
  it("rejects a date of birth in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    expect(validateAll({ ...valid, dob: "2026-08-18" }).dob).toBe(
      "Please enter a valid date of birth",
    );
  });

  it("rejects an invalid date of birth", () => {
    expect(validateAll({ ...valid, dob: "not-a-date" }).dob).toBe(
      "Please enter a valid date of birth",
    );
  });

  // อายุต้องอย่างน้อย 18 ปี — freeze วันที่เพื่อไม่ให้เทสพังตามเวลาจริง
  it("rejects a date of birth under 18 years old", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    expect(validateAll({ ...valid, dob: "2008-08-18" }).dob).toBe(
      "You must be at least 18 years old",
    );
  });

  it("accepts a date of birth on the 18th birthday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    expect(validateAll({ ...valid, dob: "2008-08-17" }).dob).toBe("");
  });

  it("returns the latest date of birth a user can pick at age 18", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    expect(latestAdultDobIsoDate()).toBe("2008-08-17");
  });

  it("uses February 28 when the 18-year cutoff falls on a missing leap day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-29T12:00:00.000Z"));

    expect(latestAdultDobIsoDate()).toBe("2006-02-28");
  });
});
