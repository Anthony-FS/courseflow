-- SUPERSEDED by docs/sql/026_public_course_outline.sql — do not re-apply.
-- CourseFlow: let logged-in learners read course catalog modules.
-- Needed by /courses/[code] (Module Samples).
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.lessons enable row level security;
alter table public.sub_lessons enable row level security;

drop policy if exists "lessons_select_authenticated"
  on public.lessons;

create policy "lessons_select_authenticated"
  on public.lessons
  for select
  to authenticated
  using (true);

drop policy if exists "sub_lessons_select_authenticated"
  on public.sub_lessons;

create policy "sub_lessons_select_authenticated"
  on public.sub_lessons
  for select
  to authenticated
  using (true);

commit;
