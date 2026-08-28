import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function isSafeAdminNextPath(pathname) {
  return (
    typeof pathname === "string" &&
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login" &&
    !pathname.startsWith("//")
  );
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh/verify the session once. The returned claims already contain the
  // user id, so admin checks below do not need a second auth.getUser() call.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin");

  // Page routes only — API handlers enforce auth via requireAdmin().
  if (isAdminPage && !isAdminApi) {
    const userId = claims?.sub;

    if (pathname === "/admin/login") {
      if (!userId) {
        return supabaseResponse;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", userId)
        .maybeSingle();

      const isAdmin =
        profile?.role === "admin" && profile?.is_active === true;

      if (isAdmin) {
        const nextPath = request.nextUrl.searchParams.get("next");
        const destination = isSafeAdminNextPath(nextPath)
          ? nextPath
          : "/admin/courses";
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = destination;
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      return supabaseResponse;
    }

    if (!userId) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" && profile?.is_active === true;

    if (!isAdmin) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}
