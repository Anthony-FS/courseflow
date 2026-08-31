-- CourseFlow: course availability for new purchases (enrolled learners keep access).
-- Apply in Supabase Dashboard → SQL Editor.

alter table public.courses
  add column if not exists is_active boolean not null default true;

create index if not exists courses_is_active_idx
  on public.courses (is_active);

comment on column public.courses.is_active is
  'When false, new purchases are blocked; existing enrollments retain learn access.';
