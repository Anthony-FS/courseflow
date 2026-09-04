-- CourseFlow: deleting a course must also delete its lessons (and their sub-lessons).
-- Recreates FKs with ON DELETE CASCADE for databases created without cascade.

begin;

do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any (c.conkey)
    where c.conrelid = 'public.lessons'::regclass
      and c.contype = 'f'
      and a.attname = 'course_id'
  loop
    execute format('alter table public.lessons drop constraint %I', rec.conname);
  end loop;

  for rec in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any (c.conkey)
    where c.conrelid = 'public.sub_lessons'::regclass
      and c.contype = 'f'
      and a.attname in ('lesson_id', 'course_id')
  loop
    execute format('alter table public.sub_lessons drop constraint %I', rec.conname);
  end loop;
end $$;

alter table public.lessons
  add constraint lessons_course_id_fkey
  foreign key (course_id) references public.courses (id)
  on delete cascade;

alter table public.sub_lessons
  add constraint sub_lessons_lesson_id_fkey
  foreign key (lesson_id) references public.lessons (id)
  on delete cascade;

alter table public.sub_lessons
  add constraint sub_lessons_course_id_fkey
  foreign key (course_id) references public.courses (id)
  on delete cascade;

commit;
