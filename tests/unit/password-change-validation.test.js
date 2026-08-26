import { describe, expect, it } from "vitest";

import {
  hasPasswordChangeErrors,
  validatePasswordChange,
} from "@/lib/password-change-validation";

const valid = {
  currentPassword: "old-secret",
  newPassword: "new-secret",
  confirmPassword: "new-secret",
};

describe("password change validation", () => {
  it("accepts a valid password change", () => {
    const errors = validatePasswordChange(valid);

    expect(errors).toEqual({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    expect(hasPasswordChangeErrors(errors)).toBe(false);
  });

  it("requires every password field", () => {
    const errors = validatePasswordChange({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    expect(errors.currentPassword).toBe("Please enter your current password");
    expect(errors.newPassword).toBe("Please enter a new password");
    expect(errors.confirmPassword).toBe("Please confirm your new password");
    expect(hasPasswordChangeErrors(errors)).toBe(true);
  });

  it("rejects a new password shorter than 6 characters", () => {
    expect(
      validatePasswordChange({
        ...valid,
        newPassword: "12345",
        confirmPassword: "12345",
      }).newPassword,
    ).toBe("Password must be at least 6 characters");
  });

  it("rejects the current password as the new password", () => {
    expect(
      validatePasswordChange({
        ...valid,
        newPassword: valid.currentPassword,
        confirmPassword: valid.currentPassword,
      }).newPassword,
    ).toBe("New password must be different from your current password");
  });

  it("rejects a confirmation that does not match", () => {
    expect(
      validatePasswordChange({ ...valid, confirmPassword: "other-secret" })
        .confirmPassword,
    ).toBe("Passwords do not match");
  });
});
