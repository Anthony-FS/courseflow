-- CourseFlow: allow authenticated admins to create/update/delete courses and promo codes
-- Fixes: "new row violates row-level security policy" when creating a course with promo.
-- Apply in Supabase Dashboard → SQL Editor (or via apply-supabase-sql.mjs).
-- Requires private.is_admin() from 007_admin_course_media_rls.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1) Enable RLS
-- ---------------------------------------------------------------------------

alter table public.courses enable row level security;
alter table public.promo_codes enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Courses — public read (catalog) + admin mutation
-- ---------------------------------------------------------------------------

drop policy if exists "courses_select_public" on public.courses;
create policy "courses_select_public"
  on public.courses
  for select
  to anon, authenticated
  using (true);

drop policy if exists "courses_insert_admin" on public.courses;
create policy "courses_insert_admin"
  on public.courses
  for insert
  to authenticated
  with check (
    (select private.is_admin())
  );

drop policy if exists "courses_update_admin" on public.courses;
create policy "courses_update_admin"
  on public.courses
  for update
  to authenticated
  using (
    (select private.is_admin())
  )
  with check (
    (select private.is_admin())
  );

drop policy if exists "courses_delete_admin" on public.courses;
create policy "courses_delete_admin"
  on public.courses
  for delete
  to authenticated
  using (
    (select private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 3) Promo codes — admin full access
-- ---------------------------------------------------------------------------

drop policy if exists "promo_codes_select_admin" on public.promo_codes;
create policy "promo_codes_select_admin"
  on public.promo_codes
  for select
  to authenticated
  using (
    (select private.is_admin())
  );

drop policy if exists "promo_codes_insert_admin" on public.promo_codes;
create policy "promo_codes_insert_admin"
  on public.promo_codes
  for insert
  to authenticated
  with check (
    (select private.is_admin())
  );

drop policy if exists "promo_codes_update_admin" on public.promo_codes;
create policy "promo_codes_update_admin"
  on public.promo_codes
  for update
  to authenticated
  using (
    (select private.is_admin())
  )
  with check (
    (select private.is_admin())
  );

drop policy if exists "promo_codes_delete_admin" on public.promo_codes;
create policy "promo_codes_delete_admin"
  on public.promo_codes
  for delete
  to authenticated
  using (
    (select private.is_admin())
  );

commit;
