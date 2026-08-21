-- CourseFlow: course_code column + case-insensitive uniqueness
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.courses
  add column if not exists course_code text;

-- FSD12 and fsd12 are treated as the same value (lower(course_code)).
create unique index if not exists courses_course_code_lower_uidx
  on public.courses (lower(course_code))
  where course_code is not null and btrim(course_code) <> '';

commit;
