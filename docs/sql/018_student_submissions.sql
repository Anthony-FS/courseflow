-- CourseFlow: student assignment submissions table (if missing)
-- and private storage bucket for file answers.
-- Apply in Supabase Dashboard → SQL Editor (or via apply-supabase-sql.mjs).

begin;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now()
);

alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (status in ('in_progress', 'submitted'));

create unique index if not exists submissions_assignment_id_user_id_uidx
  on public.submissions (assignment_id, user_id);

alter table public.submissions enable row level security;

drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own"
  on public.submissions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own"
  on public.submissions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "submissions_update_own" on public.submissions;
create policy "submissions_update_own"
  on public.submissions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment-submissions',
  'assignment-submissions',
  false,
  52428800,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "assignment_submissions_select_own" on storage.objects;
create policy "assignment_submissions_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'assignment-submissions'
  and (select private.is_active_user())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "assignment_submissions_insert_own" on storage.objects;
create policy "assignment_submissions_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'assignment-submissions'
  and (select private.is_active_user())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "assignment_submissions_update_own" on storage.objects;
create policy "assignment_submissions_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'assignment-submissions'
  and (select private.is_active_user())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'assignment-submissions'
  and (select private.is_active_user())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "assignment_submissions_delete_own" on storage.objects;
create policy "assignment_submissions_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'assignment-submissions'
  and (select private.is_active_user())
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
