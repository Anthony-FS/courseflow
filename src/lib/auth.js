import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

export async function getSessionUser() {
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
    .select("id, role, is_active, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export async function requireUser() {
  const session = await getSessionUser();

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
