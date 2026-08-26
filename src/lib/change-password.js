export async function changePassword(
  supabase,
  { email, currentPassword, newPassword },
) {
  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verificationError) {
    return {
      error: "Current password is incorrect. Please try again.",
      field: "currentPassword",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return {
      error: updateError.message || "Failed to update password. Please try again.",
      field: "newPassword",
    };
  }

  return { error: null, field: null };
}
