-- CourseFlow: indexes for batch loading learner progress on My Courses.
-- Apply in Supabase Dashboard → SQL Editor.

create index if not exists assignments_course_id_sub_lesson_id_idx
  on public.assignments (course_id, sub_lesson_id);

create index if not exists submissions_user_id_assignment_id_idx
  on public.submissions (user_id, assignment_id);
