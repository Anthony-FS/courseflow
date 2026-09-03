-- CourseFlow: let enrolled learners read sub-lesson materials.
-- docs/sql/011_enrollments.sql only covers course-level files
-- (sub_lesson_id is null), so /courses/[code]/learn could not load sub-lesson
-- videos or attachments once the service-role client was unavailable.
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.materials enable row level security;

drop policy if exists "materials_select_enrolled_sub_lesson_files" on public.materials;

create policy "materials_select_enrolled_sub_lesson_files"
  on public.materials
  for select
  to authenticated
  using (
    sub_lesson_id is not null
    and exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = materials.course_id
    )
  );

commit;

-- Verify afterwards that public.assignments is reachable by enrolled learners
-- without exposing answer_text / correct_choice:
--   select policyname, roles, cmd, qual from pg_policies
--   where schemaname = 'public' and tablename = 'assignments';
