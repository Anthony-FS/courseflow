-- CourseFlow: learner wishlists (Add to Wishlist on course detail).
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists wishlists_user_id_course_id_uidx
  on public.wishlists (user_id, course_id);

alter table public.wishlists enable row level security;

drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own"
  on public.wishlists
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own"
  on public.wishlists
  for insert
  to authenticated
  with check (user_id = auth.uid());

commit;
