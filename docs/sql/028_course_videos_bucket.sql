-- CourseFlow: private bucket for sub-lesson videos.
-- Lesson videos used to land in the public course-trailers bucket, so anyone
-- holding the publishable key could list and download paid course content
-- straight from Storage. They now live in course-videos, which is private and
-- only reachable through a server-generated signed URL after the learn page
-- has verified enrollment.
--
-- course-trailers stays public on purpose: it holds the marketing trailer shown
-- on the public course detail page.
--
-- Requires private.is_admin() / private.is_active_user() from
-- docs/sql/007_admin_course_media_rls.sql.
--
-- HOW TO APPLY (prefer Dashboard for this project):
-- The SQL Editor postgres role often cannot CREATE POLICY on storage.objects
-- (owned by supabase_storage_admin → error 42501). Prefer:
--
--   1. Storage → New bucket
--      - Name: course-videos
--      - Public: OFF
--      - Size limit: 20 MB
--      - MIME: video/mp4, video/quicktime, video/x-msvideo, video/avi
--   2. Policies on course-videos (role = authenticated for all):
--      - Admin INSERT  → bucket_id = 'course-videos' AND private.is_admin()
--      - Admin UPDATE  → same (UI may auto-add SELECT)
--      - Admin DELETE  → same (UI may auto-add SELECT)
--      - User SELECT   → bucket_id = 'course-videos' AND private.is_active_user()
--
-- The statements below are a reference / fallback when the linked role can
-- manage storage.objects. Skip them if you already created the bucket and
-- policies in the Dashboard — do not re-run DROP POLICY on the shared
-- admin_* policies unless you intend to rewrite them.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'course-videos',
    'course-videos',
    false,
    20971520,
    array['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read: signed URLs only. The learn page checks enrollment before signing.
drop policy if exists "course_videos_authenticated_read" on storage.objects;
create policy "course_videos_authenticated_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-videos'
  and (select private.is_active_user())
);

-- Extend the admin write policies from 007 to cover the new bucket.
-- WARNING: these DROP + recreate the shared admin_* policies. If you already
-- created per-bucket policies in the Dashboard, skip this section.
drop policy if exists "admin_insert_course_media" on storage.objects;
create policy "admin_insert_course_media"
on storage.objects for insert
to authenticated
with check (
  bucket_id in (
    'course-covers',
    'course-trailers',
    'course-attachments',
    'course-videos'
  )
  and (select private.is_admin())
);

drop policy if exists "admin_update_course_media" on storage.objects;
create policy "admin_update_course_media"
on storage.objects for update
to authenticated
using (
  bucket_id in (
    'course-covers',
    'course-trailers',
    'course-attachments',
    'course-videos'
  )
  and (select private.is_admin())
)
with check (
  bucket_id in (
    'course-covers',
    'course-trailers',
    'course-attachments',
    'course-videos'
  )
  and (select private.is_admin())
);

drop policy if exists "admin_delete_course_media" on storage.objects;
create policy "admin_delete_course_media"
on storage.objects for delete
to authenticated
using (
  bucket_id in (
    'course-covers',
    'course-trailers',
    'course-attachments',
    'course-videos'
  )
  and (select private.is_admin())
);

commit;
