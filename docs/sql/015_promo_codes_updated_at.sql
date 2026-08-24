-- CourseFlow: track last update time on promo codes
-- Apply in Supabase Dashboard -> SQL Editor (or via linked CLI).

begin;

alter table public.promo_codes
  add column if not exists updated_at timestamptz;

update public.promo_codes
set updated_at = coalesce(starts_at, now())
where updated_at is null;

alter table public.promo_codes
  alter column updated_at set default now();

alter table public.promo_codes
  alter column updated_at set not null;

create or replace function public.set_promo_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promo_codes_set_updated_at on public.promo_codes;

create trigger promo_codes_set_updated_at
before update on public.promo_codes
for each row
execute function public.set_promo_codes_updated_at();

commit;
