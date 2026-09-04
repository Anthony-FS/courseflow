-- Allow checkout to look up active promo codes without service role.
-- Apply in Supabase SQL Editor after 014_promo_code_courses.sql.

begin;

drop policy if exists "promo_codes_select_active" on public.promo_codes;
create policy "promo_codes_select_active"
  on public.promo_codes
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "promo_code_courses_select_public" on public.promo_code_courses;
create policy "promo_code_courses_select_public"
  on public.promo_code_courses
  for select
  to anon, authenticated
  using (true);

commit;
