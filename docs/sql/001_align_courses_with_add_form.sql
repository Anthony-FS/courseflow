-- CourseFlow: align schema with Add Course form
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).
-- Assumes public tables already exist roughly matching the previous ERD.

begin;

-- ---------------------------------------------------------------------------
-- 1) courses: summary, learning time, separate cover image + trailer
-- ---------------------------------------------------------------------------

alter table public.courses
  add column if not exists summary text,
  add column if not exists total_learning_time text,
  add column if not exists cover_image_url text,
  add column if not exists video_trailer_url text;

-- Optional one-time data move from legacy single-cover columns (if present).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'cover_file_url'
  ) then
    execute $sql$
      update public.courses
      set
        cover_image_url = coalesce(
          cover_image_url,
          case when cover_file_type = 'image' then cover_file_url end
        ),
        video_trailer_url = coalesce(
          video_trailer_url,
          case when cover_file_type = 'video' then cover_file_url end
        )
    $sql$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) lessons (UI Lesson rows)
-- ---------------------------------------------------------------------------

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create index if not exists lessons_course_id_sort_order_idx
  on public.lessons (course_id, sort_order);

-- ---------------------------------------------------------------------------
-- 3) sub_lessons.lesson_id
-- ---------------------------------------------------------------------------

alter table public.sub_lessons
  add column if not exists lesson_id uuid references public.lessons (id) on delete cascade;

create index if not exists sub_lessons_lesson_id_idx
  on public.sub_lessons (lesson_id);

-- ---------------------------------------------------------------------------
-- 4) promo_codes.min_purchase_amount
-- ---------------------------------------------------------------------------

alter table public.promo_codes
  add column if not exists min_purchase_amount numeric not null default 0;

-- ---------------------------------------------------------------------------
-- 5) Storage buckets
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 6) Storage RLS — admins can manage; public can read public buckets
-- ---------------------------------------------------------------------------

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
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  )
);

drop policy if exists "admin_insert_course_media" on storage.objects;
create policy "admin_insert_course_media"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

drop policy if exists "admin_update_course_media" on storage.objects;
create policy "admin_update_course_media"
on storage.objects for update
to authenticated
using (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

drop policy if exists "admin_delete_course_media" on storage.objects;
create policy "admin_delete_course_media"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('course-covers', 'course-trailers', 'course-attachments')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

commit;
