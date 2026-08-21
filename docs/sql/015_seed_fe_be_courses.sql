-- CourseFlow: seed Front-end (FE12) and Back-end (BE12) demo courses
-- with 6 lessons and sub-lessons each (mirrors BP12 structure).
--
-- Apply in Supabase Dashboard → SQL Editor
--   (or: node --env-file=.env.local scripts/apply-supabase-sql.mjs docs/sql/015_seed_fe_be_courses.sql
--    when SUPABASE_ACCESS_TOKEN is set)
--
-- Idempotent: skips a course_code that already exists.

begin;

create temporary table tmp_seed_lessons (
  course_code text not null,
  lesson_sort int not null,
  lesson_title text not null,
  sub_titles text[] not null
) on commit drop;

insert into tmp_seed_lessons (course_code, lesson_sort, lesson_title, sub_titles) values
-- FE12
('FE12', 0, 'Introduction to Front-end', array[
  'Welcome to Front-end',
  'How the Web Works',
  'Tools and Setup',
  'Your First Page',
  'Browser DevTools Basics',
  'Module Recap'
]),
('FE12', 1, 'HTML Structure and Semantics', array[
  'HTML Document Structure',
  'Semantic Elements',
  'Forms and Inputs',
  'Accessibility Basics',
  'Media Elements',
  'Practice: Build a Landing Page'
]),
('FE12', 2, 'CSS Layout and Responsive Design', array[
  'Selectors and Cascade',
  'Box Model and Spacing',
  'Flexbox Layouts',
  'CSS Grid',
  'Responsive Breakpoints',
  'Practice: Responsive Card Layout'
]),
('FE12', 3, 'JavaScript Fundamentals', array[
  'Variables and Types',
  'Functions and Scope',
  'Arrays and Objects',
  'Conditionals and Loops',
  'ES Modules Basics',
  'Practice: Small Utilities'
]),
('FE12', 4, 'DOM and Interactive UI', array[
  'Selecting and Updating DOM',
  'Events and Handlers',
  'Forms and Validation',
  'Fetching Data',
  'UI State Patterns',
  'Component Thinking',
  'Practice: Interactive Todo'
]),
('FE12', 5, 'Course Summary', array[
  'What You Built',
  'Front-end Checklist',
  'Common Pitfalls',
  'Next Steps with Frameworks',
  'Portfolio Tips',
  'Final Review'
]),
-- BE12
('BE12', 0, 'Introduction to Back-end', array[
  'Welcome to Back-end',
  'Client vs Server',
  'Environments and Tooling',
  'Your First Server',
  'Logging and Debugging',
  'Module Recap'
]),
('BE12', 1, 'HTTP and REST APIs', array[
  'HTTP Methods and Status Codes',
  'Request and Response Bodies',
  'REST Resource Design',
  'Query Params and Headers',
  'Error Response Patterns',
  'Practice: Design an API'
]),
('BE12', 2, 'Server-side Logic and Routing', array[
  'Routing Basics',
  'Middleware Concepts',
  'Input Validation',
  'Service Layer Pattern',
  'Handling Async Work',
  'Practice: CRUD Endpoints'
]),
('BE12', 3, 'Databases and Data Modeling', array[
  'Relational Basics',
  'Tables and Relationships',
  'Migrations Overview',
  'Queries and Filters',
  'Transactions Intro',
  'Practice: Model a Blog'
]),
('BE12', 4, 'Auth and Security Basics', array[
  'Auth vs Authorization',
  'Sessions and Tokens',
  'Password Hashing',
  'Protecting Routes',
  'CORS and Common Threats',
  'Rate Limiting Basics',
  'Practice: Secure an Endpoint'
]),
('BE12', 5, 'Course Summary', array[
  'Architecture Recap',
  'API Checklist',
  'Security Checklist',
  'Deploying Basics',
  'Working with Front-end Clients',
  'Final Review'
]);

do $$
declare
  v_created_by uuid;
  v_cover text;
  v_trailer text;
  v_course_id uuid;
  v_lesson_id uuid;
  r record;
  sub_title text;
  sub_idx int;
begin
  select created_by, cover_image_url, video_trailer_url
    into v_created_by, v_cover, v_trailer
  from public.courses
  where upper(course_code) = 'BP12'
  limit 1;

  if v_cover is null or btrim(v_cover) = '' then
    v_cover := 'course-covers/sample.jpg';
  end if;
  if v_trailer is null or btrim(v_trailer) = '' then
    v_trailer := 'course-trailers/sample.mp4';
  end if;

  if v_created_by is null then
    select id into v_created_by
    from public.profiles
    where role = 'admin' and coalesce(is_active, true) = true
    limit 1;
  end if;

  -- Front-end FE12
  if not exists (
    select 1 from public.courses where upper(course_code) = 'FE12'
  ) then
    insert into public.courses (
      created_by, title, course_code, summary, description, price,
      total_learning_time, cover_image_url, video_trailer_url
    ) values (
      v_created_by,
      'Front-end Development',
      'FE12',
      'Learn how to build modern, responsive websites with HTML, CSS, and JavaScript, then structure UI with reusable components.',
      'This course covers the core front-end stack from layout and styling to interactive UI. Students practice semantic HTML, CSS fundamentals and responsive design, JavaScript for DOM and logic, and component-based thinking used in modern web apps. By the end, learners can build multi-page interfaces, style them consistently, and connect basic user interactions ready for further framework study.',
      12000,
      '12',
      v_cover,
      v_trailer
    )
    returning id into v_course_id;

    for r in
      select lesson_sort, lesson_title, sub_titles
      from tmp_seed_lessons
      where course_code = 'FE12'
      order by lesson_sort
    loop
      insert into public.lessons (course_id, title, sort_order)
      values (v_course_id, r.lesson_title, r.lesson_sort)
      returning id into v_lesson_id;

      sub_idx := 1;
      foreach sub_title in array r.sub_titles loop
        insert into public.sub_lessons (
          course_id, lesson_id, title, sort_order, is_preview
        ) values (
          v_course_id, v_lesson_id, sub_title, sub_idx, false
        );
        sub_idx := sub_idx + 1;
      end loop;
    end loop;
  end if;

  -- Back-end BE12
  if not exists (
    select 1 from public.courses where upper(course_code) = 'BE12'
  ) then
    insert into public.courses (
      created_by, title, course_code, summary, description, price,
      total_learning_time, cover_image_url, video_trailer_url
    ) values (
      v_created_by,
      'Back-end Development',
      'BE12',
      'Learn how servers, APIs, and databases work together so you can build secure, data-driven back-end applications.',
      'This course introduces back-end fundamentals including HTTP, REST APIs, server-side logic, authentication basics, and working with databases. Students practice designing endpoints, handling requests and responses, validating input, and storing data reliably. By the end, learners can build a simple API-backed service and understand how front-end clients consume it.',
      12000,
      '12',
      v_cover,
      v_trailer
    )
    returning id into v_course_id;

    for r in
      select lesson_sort, lesson_title, sub_titles
      from tmp_seed_lessons
      where course_code = 'BE12'
      order by lesson_sort
    loop
      insert into public.lessons (course_id, title, sort_order)
      values (v_course_id, r.lesson_title, r.lesson_sort)
      returning id into v_lesson_id;

      sub_idx := 1;
      foreach sub_title in array r.sub_titles loop
        insert into public.sub_lessons (
          course_id, lesson_id, title, sort_order, is_preview
        ) values (
          v_course_id, v_lesson_id, sub_title, sub_idx, false
        );
        sub_idx := sub_idx + 1;
      end loop;
    end loop;
  end if;
end $$;

commit;
