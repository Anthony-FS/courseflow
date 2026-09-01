import { revalidateTag } from "next/cache";

export async function touchCourseUpdatedAt(supabase, courseId) {
  if (!supabase || !courseId) return;

  await supabase
    .from("courses")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", courseId);

  revalidateTag("courses", { expire: 0 });
}
