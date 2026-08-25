-- CourseFlow: per-user sub-lesson progress (visit / complete / assignment submit).
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).
-- Safe to re-run if an older `sub_lesson_progress` exists with fewer columns.

begin;

create table if not exists public.sub_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sub_lesson_id uuid not null references public.sub_lessons (id) on delete cascade,
  completed_at timestamptz
);

-- Older ERD-only tables may lack these columns.
alter table public.sub_lesson_progress
  add column if not exists course_id uuid references public.courses (id) on delete cascade;

alter table public.sub_lesson_progress
  add column if not exists visited_at timestamptz;

alter table public.sub_lesson_progress
  add column if not exists assignment_submitted_at timestamptz;

alter table public.sub_lesson_progress
  add column if not exists created_at timestamptz;

alter table public.sub_lesson_progress
  add column if not exists updated_at timestamptz;

-- Backfill course_id when an older table already had rows.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sub_lessons'
      and column_name = 'course_id'
  ) then
    update public.sub_lesson_progress as p
    set course_id = s.course_id
    from public.sub_lessons as s
    where p.course_id is null
      and p.sub_lesson_id = s.id
      and s.course_id is not null;
  else
    update public.sub_lesson_progress as p
    set course_id = l.course_id
    from public.sub_lessons as s
    join public.lessons as l on l.id = s.lesson_id
    where p.course_id is null
      and p.sub_lesson_id = s.id
      and l.course_id is not null;
  end if;
end $$;

update public.sub_lesson_progress
set created_at = coalesce(created_at, completed_at, now())
where created_at is null;

update public.sub_lesson_progress
set visited_at = coalesce(visited_at, completed_at, created_at, now())
where visited_at is null;

update public.sub_lesson_progress
set updated_at = coalesce(updated_at, created_at, visited_at, now())
where updated_at is null;

-- Require course_id only after backfill (fails clearly if orphans remain).
do $$
begin
  if exists (
    select 1
    from public.sub_lesson_progress
    where course_id is null
  ) then
    raise exception
      'sub_lesson_progress has rows without course_id; fix or delete them, then re-run.';
  end if;
end $$;

alter table public.sub_lesson_progress
  alter column course_id set not null;

alter table public.sub_lesson_progress
  alter column visited_at set default now();

alter table public.sub_lesson_progress
  alter column visited_at set not null;

alter table public.sub_lesson_progress
  alter column created_at set default now();

alter table public.sub_lesson_progress
  alter column created_at set not null;

alter table public.sub_lesson_progress
  alter column updated_at set default now();

alter table public.sub_lesson_progress
  alter column updated_at set not null;

create unique index if not exists sub_lesson_progress_user_id_sub_lesson_id_uidx
  on public.sub_lesson_progress (user_id, sub_lesson_id);

create index if not exists sub_lesson_progress_user_id_course_id_idx
  on public.sub_lesson_progress (user_id, course_id);

alter table public.sub_lesson_progress enable row level security;

drop policy if exists "sub_lesson_progress_select_own" on public.sub_lesson_progress;
create policy "sub_lesson_progress_select_own"
  on public.sub_lesson_progress
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "sub_lesson_progress_insert_own" on public.sub_lesson_progress;
create policy "sub_lesson_progress_insert_own"
  on public.sub_lesson_progress
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = course_id
    )
  );

drop policy if exists "sub_lesson_progress_update_own" on public.sub_lesson_progress;
create policy "sub_lesson_progress_update_own"
  on public.sub_lesson_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
