import { describe, expect, it, vi } from "vitest";

import { registerGuest } from "@/lib/register-guest";

// ใส่ช่องว่างหน้า-หลังเพื่อตรวจว่า trim ก่อนส่งไป Supabase
const valid = {
  fullName: "  Somchai Jaidee  ",
  dob: "1998-05-12",
  education: "  Bachelor of CS  ",
  email: "  somchai@mail.com  ",
  password: "secret1",
  confirmPassword: "secret1",
};

// mock เฉพาะ auth.signUp / signOut ไม่ยิง Supabase จริง
function createAuthMock({
  session = { access_token: "token" },
  error = null,
} = {}) {
  const signUp = vi.fn(async () => ({
    data: { session, user: { id: "user-1" } },
    error,
  }));
  const signOut = vi.fn(async () => ({ error: null }));

  return {
    auth: { signUp, signOut },
  };
}

describe("registerGuest integration", () => {
  // Happy Path: trim ชื่อ/อีเมล/การศึกษา, ส่ง metadata ถูก, มี session ต้อง signOut
  it("signs up with trimmed fields and signs out when a session is returned", async () => {
    const supabase = createAuthMock();

    const result = await registerGuest(supabase, valid);

    expect(result).toEqual({ ok: true, errors: null, error: null });
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "somchai@mail.com",
      password: "secret1",
      options: {
        data: {
          full_name: "Somchai Jaidee",
          date_of_birth: "1998-05-12",
          educational_background: "Bachelor of CS",
        },
      },
    });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  // บางโปรเจกต์ปิด auto-login หลังสมัคร → ไม่มี session ก็ไม่ต้อง signOut
  it("does not sign out when signUp returns no session", async () => {
    const supabase = createAuthMock({ session: null });

    const result = await registerGuest(supabase, valid);

    expect(result.ok).toBe(true);
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  // อีเมลซ้ำหรือ Supabase error: โชว์ข้อความ error และยังไม่ signOut
  it("returns the Supabase error and does not sign out", async () => {
    const supabase = createAuthMock({
      error: { message: "User already registered" },
    });

    const result = await registerGuest(supabase, valid);

    expect(result).toEqual({
      ok: false,
      errors: null,
      error: "User already registered",
    });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  // ข้อมูลไม่ผ่าน validation ต้องไม่ยิง signUp เลย
  it("does not call signUp when validation fails", async () => {
    const supabase = createAuthMock();

    const result = await registerGuest(supabase, {
      ...valid,
      email: "",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.email).toBe("Please enter your email");
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
