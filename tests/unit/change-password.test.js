import { describe, expect, it, vi } from "vitest";

import { changePassword } from "@/lib/change-password";

function createSupabaseMock({ verificationError = null, updateError = null } = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: verificationError }),
      updateUser: vi.fn().mockResolvedValue({ error: updateError }),
    },
  };
}

const values = {
  email: "student@example.com",
  currentPassword: "old-secret",
  newPassword: "new-secret",
};

describe("changePassword", () => {
  it("verifies the current password before updating it", async () => {
    const supabase = createSupabaseMock();

    const result = await changePassword(supabase, values);

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: values.email,
      password: values.currentPassword,
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: values.newPassword,
    });
    expect(result).toEqual({ error: null, field: null });
  });

  it("does not update when the current password is incorrect", async () => {
    const supabase = createSupabaseMock({
      verificationError: new Error("Invalid login credentials"),
    });

    const result = await changePassword(supabase, values);

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: "Current password is incorrect. Please try again.",
      field: "currentPassword",
    });
  });

  it("returns an update error", async () => {
    const supabase = createSupabaseMock({
      updateError: new Error("Password should be different"),
    });

    const result = await changePassword(supabase, values);

    expect(result).toEqual({
      error: "Password should be different",
      field: "newPassword",
    });
  });
});
