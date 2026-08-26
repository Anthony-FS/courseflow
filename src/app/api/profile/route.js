import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  hasRegisterErrors,
  validateAll,
} from "@/lib/register-validation";

export async function PATCH(request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const values = {
    fullName: String(body.fullName ?? ""),
    dob: String(body.dob ?? ""),
    education: String(body.education ?? ""),
    email: String(body.email ?? user.email ?? ""),
    password: "profile-update",
    confirmPassword: "profile-update",
  };
  const errors = validateAll(values);

  if (hasRegisterErrors({ fullName: errors.fullName, dob: errors.dob, email: errors.email })) {
    return jsonError("Please check the required profile fields", 400, { errors });
  }

  if (values.email.trim().toLowerCase() !== String(user.email ?? "").toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: values.email.trim(),
    });
    if (emailError) {
      return jsonError(emailError.message || "Failed to update email", 400, {
        errors: { email: emailError.message || "Please enter a valid email" },
      });
    }
  }

  const profileUpdate = {
    full_name: values.fullName.trim(),
    date_of_birth: values.dob,
    educational_background: values.education.trim(),
  };

  if (body.removeAvatar === true) {
    profileUpdate.avatar_url = null;
  }

  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id)
    .select("id, full_name, date_of_birth, educational_background, avatar_url")
    .single();

  if (updateError) {
    return jsonError(updateError.message || "Failed to update profile", 500);
  }

  return jsonOk({ profile });
}
