-- CourseFlow: publish the course outline (lesson + sub-lesson titles) to visitors.
-- Needed by /courses and /courses/[code] (lesson count + Module Samples) so the
-- outline shows before login and before enrollment.
-- Sub-lesson content (description) stays enrollment-gated: only titles are
-- exposed, through public.sub_lesson_outline.
--
-- Replaces docs/sql/008_course_catalog_select.sql and
-- docs/sql/024_fix_lessons_sub_lessons_rls.sql. The live database was found
-- serving public.sub_lessons (including description) to the anon role, so the
-- blocks below drop every select policy on both tables except the admin ones
-- from docs/sql/005_lessons_admin_mutation_policies.sql.
--
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.lessons enable row level security;
alter table public.sub_lessons enable row level security;

-- ---------------------------------------------------------------------------
-- 1) Drop unknown select policies so no permissive leftover survives
-- ---------------------------------------------------------------------------

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('lessons', 'sub_lessons')
      and cmd in ('SELECT', 'ALL')
      and policyname not in ('lessons_select_admin', 'sub_lessons_select_admin')
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Lessons: id / course_id / title / sort_order only, safe to publish
-- ---------------------------------------------------------------------------

create policy "lessons_select_public"
  on public.lessons
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3) Sub-lessons: description holds the paid content, so keep the table gated
--    behind enrollment. Admins keep sub_lessons_select_admin from 005.
-- ---------------------------------------------------------------------------

create policy "sub_lessons_select_enrolled"
  on public.sub_lessons
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = sub_lessons.course_id
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Public outline view: titles without description.
--    security_invoker = false runs the view as its owner, so the gated
--    sub_lessons policy above does not apply — column selection is the guard.
-- ---------------------------------------------------------------------------

drop view if exists public.sub_lesson_outline;

create view public.sub_lesson_outline
with (security_invoker = false) as
  select
    id,
    course_id,
    lesson_id,
    title,
    sort_order
  from public.sub_lessons;

grant select on public.sub_lesson_outline to anon, authenticated;

commit;

notify pgrst, 'reload schema';
