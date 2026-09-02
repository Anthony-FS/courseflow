-- CourseFlow: assignment timestamps and admin availability status.
-- Apply in Supabase Dashboard -> SQL Editor (or via apply-supabase-sql.mjs).

begin;

alter table public.assignments
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists is_active boolean not null default true;

create or replace function public.set_assignments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assignments_set_updated_at on public.assignments;

create trigger assignments_set_updated_at
before update on public.assignments
for each row
execute function public.set_assignments_updated_at();

commit;
