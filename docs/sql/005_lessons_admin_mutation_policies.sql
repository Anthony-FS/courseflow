-- CourseFlow: allow authenticated admins to create, update, and delete lessons, sub-lessons, and materials
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

-- ---------------------------------------------------------------------------
-- 1) Enable RLS
-- ---------------------------------------------------------------------------

alter table public.lessons enable row level security;
alter table public.sub_lessons enable row level security;
alter table public.materials enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Lessons Policies (Admin Mutation)
-- ---------------------------------------------------------------------------

drop policy if exists "lessons_insert_admin" on public.lessons;
create policy "lessons_insert_admin"
  on public.lessons
  for insert
  to authenticated
  with check (
    (select private.is_admin())
  );

drop policy if exists "lessons_update_admin" on public.lessons;
create policy "lessons_update_admin"
  on public.lessons
  for update
  to authenticated
  using (
    (select private.is_admin())
  )
  with check (
    (select private.is_admin())
  );

drop policy if exists "lessons_delete_admin" on public.lessons;
create policy "lessons_delete_admin"
  on public.lessons
  for delete
  to authenticated
  using (
    (select private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 3) Sub-lessons Policies (Admin Full Access)
-- ---------------------------------------------------------------------------

drop policy if exists "sub_lessons_select_admin" on public.sub_lessons;
create policy "sub_lessons_select_admin"
  on public.sub_lessons
  for select
  to authenticated
  using (
    (select private.is_admin())
  );

drop policy if exists "sub_lessons_insert_admin" on public.sub_lessons;
create policy "sub_lessons_insert_admin"
  on public.sub_lessons
  for insert
  to authenticated
  with check (
    (select private.is_admin())
  );

drop policy if exists "sub_lessons_update_admin" on public.sub_lessons;
create policy "sub_lessons_update_admin"
  on public.sub_lessons
  for update
  to authenticated
  using (
    (select private.is_admin())
  )
  with check (
    (select private.is_admin())
  );

drop policy if exists "sub_lessons_delete_admin" on public.sub_lessons;
create policy "sub_lessons_delete_admin"
  on public.sub_lessons
  for delete
  to authenticated
  using (
    (select private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 4) Materials Policies (Admin Full Access)
-- ---------------------------------------------------------------------------

drop policy if exists "materials_select_admin" on public.materials;
create policy "materials_select_admin"
  on public.materials
  for select
  to authenticated
  using (
    (select private.is_admin())
  );

drop policy if exists "materials_insert_admin" on public.materials;
create policy "materials_insert_admin"
  on public.materials
  for insert
  to authenticated
  with check (
    (select private.is_admin())
  );

drop policy if exists "materials_update_admin" on public.materials;
create policy "materials_update_admin"
  on public.materials
  for update
  to authenticated
  using (
    (select private.is_admin())
  )
  with check (
    (select private.is_admin())
  );

drop policy if exists "materials_delete_admin" on public.materials;
create policy "materials_delete_admin"
  on public.materials
  for delete
  to authenticated
  using (
    (select private.is_admin())
  );

commit;
