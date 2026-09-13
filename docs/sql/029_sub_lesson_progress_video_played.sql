-- CourseFlow: persist "learner played the sub-lesson video".
-- Completion is backend-confirmed, so the media gate cannot live in
-- localStorage only — play on one device, scroll to the end on another.
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI). Safe to re-run.

begin;

alter table public.sub_lesson_progress
  add column if not exists video_played_at timestamptz;

commit;
