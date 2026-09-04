-- CourseFlow: keep video only on Basic Programming's first intro sub-lesson
-- ("What is programming" / "What programming is"). Remove other lesson videos.
-- Run in Supabase SQL Editor with an admin/service-role context.

begin;

create temporary table _bp_keep_video_sub_lessons on commit drop as
select sl.id
from public.sub_lessons sl
join public.lessons l on l.id = sl.lesson_id
join public.courses c on c.id = l.course_id
where lower(btrim(c.title)) = 'basic programming'
  and lower(btrim(sl.title)) in (
    'what is programming',
    'what programming is'
  );

create temporary table _bp_strip_video_sub_lessons on commit drop as
select sl.id
from public.sub_lessons sl
join public.lessons l on l.id = sl.lesson_id
join public.courses c on c.id = l.course_id
where lower(btrim(c.title)) = 'basic programming'
  and sl.id not in (select id from _bp_keep_video_sub_lessons);

-- 1) Remove legacy video material rows for every other Basic Programming sub-lesson.
delete from public.materials m
using _bp_strip_video_sub_lessons targets
where m.sub_lesson_id = targets.id
  and (
    lower(coalesce(m.file_type, '')) like 'video/%'
    or lower(coalesce(m.file_type, '')) = 'video'
    or lower(coalesce(m.file_url, '')) like '%course-trailers%'
    or lower(coalesce(m.file_url, '')) like '%trailer%'
    or lower(coalesce(m.file_url, '')) ~ '\.(mp4|webm|mov|m4v)(\?|$)'
  );

-- 2) Strip video player blocks from rich sub-lesson descriptions.
update public.sub_lessons as sl
set description = coalesce(
  (
    select case
      when filtered.blocks is null then ''
      when jsonb_array_length(filtered.blocks) = 0 then ''
      when
        jsonb_array_length(filtered.blocks) = 1
        and filtered.blocks->0->>'type' = 'text'
      then coalesce(filtered.blocks->0->>'content', '')
      else filtered.blocks::text
    end
    from (
      select jsonb_agg(elem order by ordinality) as blocks
      from jsonb_array_elements(sl.description::jsonb)
        with ordinality as t(elem, ordinality)
      where lower(coalesce(elem->>'type', '')) <> 'video'
    ) as filtered
  ),
  sl.description
)
from _bp_strip_video_sub_lessons targets
where sl.id = targets.id
  and btrim(coalesce(sl.description, '')) like '[%'
  and btrim(coalesce(sl.description, '')) like '%]%';

commit;
