-- CourseFlow: assignment submission settings for Add Assignment form
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.assignments
  add column if not exists submission_type text not null default 'text';

alter table public.assignments
  add column if not exists allowed_file_types text[];

alter table public.assignments
  add column if not exists max_file_size_mb int;

alter table public.assignments
  drop constraint if exists assignments_submission_type_check;

alter table public.assignments
  add constraint assignments_submission_type_check
  check (submission_type in ('text', 'file', 'url'));

alter table public.assignments
  drop constraint if exists assignments_allowed_file_types_check;

alter table public.assignments
  add constraint assignments_allowed_file_types_check
  check (
    allowed_file_types is null
    or allowed_file_types <@ array['pdf', 'doc', 'image']::text[]
  );

alter table public.assignments
  drop constraint if exists assignments_file_fields_check;

alter table public.assignments
  add constraint assignments_file_fields_check
  check (
    (
      submission_type = 'file'
      and allowed_file_types is not null
      and cardinality(allowed_file_types) >= 1
      and max_file_size_mb in (5, 10, 20, 50)
    )
    or (
      submission_type <> 'file'
      and allowed_file_types is null
      and max_file_size_mb is null
    )
  );

commit;
