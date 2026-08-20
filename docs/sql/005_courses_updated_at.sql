-- CourseFlow: track last update time on courses
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.courses
  add column if not exists updated_at timestamptz;

update public.courses
set updated_at = created_at
where updated_at is null;

alter table public.courses
  alter column updated_at set default now();

alter table public.courses
  alter column updated_at set not null;

create or replace function public.set_courses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_set_updated_at on public.courses;

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_courses_updated_at();

commit;
