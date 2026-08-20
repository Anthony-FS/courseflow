-- CourseFlow: learner enrollments (subscribe / Start Learning).
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists enrollments_user_id_course_id_uidx
  on public.enrollments (user_id, course_id);

alter table public.enrollments enable row level security;

drop policy if exists "enrollments_select_own" on public.enrollments;
create policy "enrollments_select_own"
  on public.enrollments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "enrollments_insert_own" on public.enrollments;
create policy "enrollments_insert_own"
  on public.enrollments
  for insert
  to authenticated
  with check (user_id = auth.uid());

alter table public.materials enable row level security;

drop policy if exists "materials_select_enrolled_course_files" on public.materials;
create policy "materials_select_enrolled_course_files"
  on public.materials
  for select
  to authenticated
  using (
    sub_lesson_id is null
    and exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = materials.course_id
    )
  );

commit;
