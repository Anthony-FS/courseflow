-- CourseFlow: storage buckets for add-course media
-- Cover image, video trailer, and optional attached file.
-- Apply in Supabase Dashboard → SQL Editor (or via apply-supabase-sql.mjs).
-- Admin upload/update/delete policies use private.is_admin() from
-- docs/sql/007_admin_course_media_rls.sql — apply 007 if those helpers
-- are not already in the database.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'course-covers',
    'course-covers',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/jpg']
  ),
  (
    'course-trailers',
    'course-trailers',
    true,
    20971520,
    array['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi']
  ),
  (
    'course-attachments',
    'course-attachments',
    false,
    20971520,
    null
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

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
