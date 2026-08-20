import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/admin/uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
