-- CourseFlow: let signed-in admins upload cover, trailer, and attachment
-- files with the anon/publishable key (no service role).
-- Apply in Supabase Dashboard → SQL Editor (or via apply-supabase-sql.mjs).
--
-- Why: storage policies that SELECT public.profiles are evaluated under
-- profiles RLS and often fail. private.is_admin() is SECURITY DEFINER
-- (same pattern as 004_lessons_select_policy.sql).

begin;

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_active_user() from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active_user() to authenticated;

drop policy if exists "course_covers_public_read" on storage.objects;
create policy "course_covers_public_read"
on storage.objects for select
to public
using (bucket_id = 'course-covers');

drop policy if exists "course_trailers_public_read" on storage.objects;
create policy "course_trailers_public_read"
on storage.objects for select
to public
using (bucket_id = 'course-trailers');

drop policy if exists "course_attachments_authenticated_read" on storage.objects;
create policy "course_attachments_authenticated_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-attachments'
  and (select private.is_active_user())
);

drop policy if exists "admin_insert_course_media" on storage.objects;
create policy "admin_insert_course_media"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and (select private.is_admin())
);

drop policy if exists "admin_update_course_media" on storage.objects;
create policy "admin_update_course_media"
on storage.objects for update
to authenticated
using (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and (select private.is_admin())
)
with check (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and (select private.is_admin())
);

drop policy if exists "admin_delete_course_media" on storage.objects;
create policy "admin_delete_course_media"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and (select private.is_admin())
);

commit;
