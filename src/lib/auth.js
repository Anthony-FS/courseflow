import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";
import { cache } from "react";

const PROFILE_COLUMNS =
  "id, role, is_active, full_name, date_of_birth, educational_background, avatar_url";

function userFromClaims(claims) {
  const id = claims?.sub;
  if (!id) return null;

  return {
    id,
    email: claims.email ?? null,
    user_metadata: claims.user_metadata ?? {},
  };
}

async function loadProfile(supabase, userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  return profile ?? null;
}

export const getSessionUser = cache(async function getSessionUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const user = error ? null : userFromClaims(data?.claims);

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const profile = await loadProfile(supabase, user.id);

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
  const session = await getAuthenticatedUser();

  if (!session.user) {
    return {
      ...session,
      profile: null,
      error: jsonError("Unauthorized", 401),
    };
  }

  const profile = await loadProfile(session.supabase, session.user.id);
  const isAdmin = profile?.role === "admin" && profile?.is_active === true;

  if (!isAdmin) {
    return {
      ...session,
      profile,
      error: jsonError("Forbidden", 403),
    };
  }

  return { ...session, profile, error: null };
}
