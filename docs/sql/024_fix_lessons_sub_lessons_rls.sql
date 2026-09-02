-- CourseFlow: Fix security vulnerability in RLS policies for lessons and sub_lessons
-- Scope select access to enrolled users or preview sub-lessons only.
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

drop policy if exists "lessons_select_authenticated" on public.lessons;

create policy "lessons_select_authenticated"
  on public.lessons
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = lessons.course_id
    )
    or exists (
      select 1
      from public.sub_lessons sl
      where sl.lesson_id = lessons.id
        and sl.is_preview = true
    )
  );

drop policy if exists "sub_lessons_select_authenticated" on public.sub_lessons;

create policy "sub_lessons_select_authenticated"
  on public.sub_lessons
  for select
  to authenticated
  using (
    is_preview = true
    or exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = sub_lessons.course_id
    )
  );

commit;
