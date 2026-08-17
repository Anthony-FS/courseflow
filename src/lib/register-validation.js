const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function validateField(name, values) {
  const value = values[name].trim();

  switch (name) {
    case "fullName":
      return value ? "" : "Please enter your name";
    case "dob": {
      if (!values.dob) {
        return "Please enter your date of birth";
      }
      const dob = new Date(`${values.dob}T00:00:00`);
      if (Number.isNaN(dob.getTime()) || values.dob > todayIsoDate()) {
        return "Please enter a valid date of birth";
      }
      return "";
    }
    case "education":
      return "";
    case "email":
      if (!value) {
        return "Please enter your email";
      }
      return EMAIL_PATTERN.test(value) ? "" : "Please enter a valid email";
    case "password":
      if (!values.password) {
        return "Please enter a password";
      }
      return values.password.length >= 6
        ? ""
        : "Password must be at least 6 characters";
    case "confirmPassword":
      if (!values.confirmPassword) {
        return "Please confirm your password";
      }
      return values.confirmPassword === values.password
        ? ""
        : "Passwords do not match";
    default:
      return "";
  }
}

export function validateAll(values) {
  return {
    fullName: validateField("fullName", values),
    dob: validateField("dob", values),
    education: validateField("education", values),
    email: validateField("email", values),
    password: validateField("password", values),
    confirmPassword: validateField("confirmPassword", values),
  };
}

export function hasRegisterErrors(errors) {
  return Object.values(errors).some(Boolean);
}
