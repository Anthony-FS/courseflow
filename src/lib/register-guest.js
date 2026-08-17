import { hasRegisterErrors, validateAll } from "@/lib/register-validation";

const FALLBACK_ERROR = "Registration failed. Please try again.";

export async function registerGuest(supabase, values) {
  const errors = validateAll(values);

  if (hasRegisterErrors(errors)) {
    return { ok: false, errors, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email: values.email.trim(),
    password: values.password,
    options: {
      data: {
        full_name: values.fullName.trim(),
        date_of_birth: values.dob,
        educational_background: values.education.trim(),
      },
    },
  });

  if (error) {
    return {
      ok: false,
      errors: null,
      error: error.message || FALLBACK_ERROR,
    };
  }

  if (data?.session) {
    await supabase.auth.signOut();
  }

  return { ok: true, errors: null, error: null };
}
