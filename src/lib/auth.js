import { createClient, createServiceClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

/** Temporary: skip admin checks until login UI exists. */
const TEMP_DISABLE_ADMIN_API_PROTECTION = true;

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
    .select("id, role, is_active, full_name")
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

  if (TEMP_DISABLE_ADMIN_API_PROTECTION) {
    if (session.user) {
      return { ...session, error: null };
    }

    // No browser session: use service role + first active admin for local testing.
    const service = createServiceClient();
    if (!service) {
      return {
        ...session,
        error: jsonError(
          "Temporary API bypass needs a logged-in user or SUPABASE_SERVICE_ROLE_KEY in .env",
          401,
        ),
      };
    }

    const { data: admin, error: adminError } = await service
      .from("profiles")
      .select("id, role, is_active, full_name")
      .eq("role", "admin")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (adminError || !admin) {
      return {
        supabase: service,
        user: null,
        profile: null,
        error: jsonError(
          adminError?.message ||
            "Temporary API bypass needs at least one active admin profile",
          500,
        ),
      };
    }

    return {
      supabase: service,
      user: { id: admin.id },
      profile: admin,
      error: null,
    };
  }

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
