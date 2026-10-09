import { cache } from "react";

import { getCourseByCode } from "@/lib/courses";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const getCachedCourseByCode = cache(async function getCachedCourseByCode(code) {
  const supabase = createServiceClient() ?? (await createClient());
  return getCourseByCode(supabase, code, supabase);
});
