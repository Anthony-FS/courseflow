-- CourseFlow: allow authenticated admins to read lessons
-- Required by the Admin Assignment List to display lesson names.
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.lessons enable row level security;

drop policy if exists "lessons_select_admin"
  on public.lessons;

create policy "lessons_select_admin"
  on public.lessons
  for select
  to authenticated
  using (
    (select private.is_admin())
  );

commit;