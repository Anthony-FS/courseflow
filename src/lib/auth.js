import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { cache } from "react";

export const getSessionUser = cache(async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, is_active, full_name, date_of_birth, educational_background, avatar_url",
    )
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
});

export const getAuthenticatedUser = cache(async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error || !user ? null : user,
  };
});

export async function requireUser() {
  const session = await getAuthenticatedUser();

  if (!session.user) {
    return {
      ...session,
      error: jsonError("Unauthorized", 401),
    };
  }

  return { ...session, error: null };
}

export async function requireAdmin() {
  const session = await getSessionUser();

  if (!session.user) {
    return {
      ...session,
      error: jsonError("Unauthorized", 401),
    };
  }

  const isAdmin =
    session.profile?.role === "admin" && session.profile?.is_active === true;

  if (!isAdmin) {
    return {
      ...session,
      error: jsonError("Forbidden", 403),
    };
  }

  return { ...session, error: null };
}
