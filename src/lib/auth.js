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

  if (TEMP_DISABLE_ADMIN_API_PROTECTION) {
    const service = createServiceClient();
    if (service) {
      const { data: admin } = await service
        .from("profiles")
        .select("id, role, is_active, full_name, avatar_url")
        .eq("role", "admin")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const adminId =
        admin?.id || session.user?.id || "00000000-0000-0000-0000-000000000001";

      return {
        supabase: service,
        user: { id: adminId },
        profile: admin || {
          id: adminId,
          role: "admin",
          is_active: true,
          full_name: "Admin Tester",
        },
        error: null,
      };
    }

    if (session.user) {
      return { ...session, error: null };
    }

    return {
      supabase: session.supabase,
      user: { id: "00000000-0000-0000-0000-000000000001" },
      profile: {
        id: "00000000-0000-0000-0000-000000000001",
        role: "admin",
        is_active: true,
        full_name: "Admin Tester",
      },
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
