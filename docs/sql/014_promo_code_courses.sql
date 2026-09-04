-- Allow one promo code to apply to multiple courses without duplicating the
-- globally unique promo_codes.code value.

begin;

create table if not exists public.promo_code_courses (
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (promo_code_id, course_id)
);

-- Migrate existing course-specific promo rows into the new relationship table.
insert into public.promo_code_courses (promo_code_id, course_id)
select id, course_id
from public.promo_codes
where course_id is not null
on conflict (promo_code_id, course_id) do nothing;

alter table public.promo_code_courses enable row level security;

drop policy if exists "promo_code_courses_select_admin" on public.promo_code_courses;
create policy "promo_code_courses_select_admin"
  on public.promo_code_courses
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "promo_code_courses_insert_admin" on public.promo_code_courses;
create policy "promo_code_courses_insert_admin"
  on public.promo_code_courses
  for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "promo_code_courses_delete_admin" on public.promo_code_courses;
create policy "promo_code_courses_delete_admin"
  on public.promo_code_courses
  for delete
  to authenticated
  using ((select private.is_admin()));

commit;
