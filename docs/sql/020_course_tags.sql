-- CourseFlow: course tags lookup + courses.tag_id
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

create table if not exists public.course_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  constraint course_tags_slug_nonempty check (btrim(slug) <> ''),
  constraint course_tags_name_nonempty check (btrim(name) <> '')
);

insert into public.course_tags (slug, name)
values
  ('development', 'Development'),
  ('marketing', 'Marketing'),
  ('business', 'Business')
on conflict (slug) do nothing;

alter table public.courses
  add column if not exists tag_id uuid references public.course_tags (id);

update public.courses
set tag_id = (
  select id from public.course_tags where slug = 'development' limit 1
)
where tag_id is null;

alter table public.courses
  alter column tag_id set not null;

alter table public.course_tags enable row level security;

drop policy if exists "course_tags_select_authenticated" on public.course_tags;
create policy "course_tags_select_authenticated"
  on public.course_tags
  for select
  to authenticated
  using (true);

commit;
