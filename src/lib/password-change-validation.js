export function validatePasswordChange(values) {
  const errors = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  if (!values.currentPassword) {
    errors.currentPassword = "Please enter your current password";
  }

  if (!values.newPassword) {
    errors.newPassword = "Please enter a new password";
  } else if (values.newPassword.length < 6) {
    errors.newPassword = "Password must be at least 6 characters";
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = "New password must be different from your current password";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password";
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

export function hasPasswordChangeErrors(errors) {
  return Object.values(errors).some(Boolean);
}
