-- CourseFlow: seed 4 Marketing + 4 Business demo courses (same shape as Add Course).
-- Requires 020_course_tags.sql (and courses schema) already applied.
-- Run in Supabase SQL Editor with an admin/service-role context.

begin;

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------

insert into public.courses (
  created_by,
  title,
  course_code,
  tag_id,
  summary,
  description,
  price,
  total_learning_time,
  cover_image_url,
  video_trailer_url,
  is_active
)
select
  (select id from public.profiles where role = 'admin' and is_active = true limit 1),
  seed.title,
  seed.course_code,
  (
    select id
    from public.course_tags
    where slug = seed.tag_slug
    limit 1
  ),
  seed.summary,
  seed.description,
  seed.price,
  seed.total_learning_time,
  seed.cover_image_url,
  seed.video_trailer_url,
  true
from (
  values
    (
      'Digital Marketing Fundamentals',
      'MKT101',
      'marketing',
      'Build a practical foundation in channels, funnels, and campaign measurement.',
      'Learn how to plan, launch, and measure digital marketing campaigns across search, social, email, and content. You will practice audience research, messaging, and reading performance dashboards so every campaign decision is grounded in data.',
      4590,
      '10',
      '/courses/service-design.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Content Strategy & Brand Storytelling',
      'MKT201',
      'marketing',
      'Craft brand narratives and content systems that convert attention into trust.',
      'Design a content strategy from positioning to publishing cadence. Cover story frameworks, channel-fit formats, editorial calendars, and lightweight SEO so your brand voice stays consistent while still driving measurable engagement.',
      5290,
      '12',
      '/courses/ux-ui-beginner.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Social Media Growth Playbook',
      'MKT301',
      'marketing',
      'Grow organic reach with platform-native content, community, and analytics loops.',
      'Build repeatable social media systems for awareness and conversion. Practice short-form creative briefs, community moderation basics, paid boost decisions, and weekly reporting that ties posts back to business outcomes.',
      4890,
      '11',
      '/courses/software-developer.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Email Marketing & Retention',
      'MKT401',
      'marketing',
      'Design lifecycle email journeys that welcome, nurture, and win customers back.',
      'Map customer lifecycle moments into email sequences. Cover list hygiene, segmentation, copy that converts, deliverability basics, and A/B testing so retention campaigns improve month over month.',
      4390,
      '9',
      '/courses/service-design.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Business Strategy Essentials',
      'BUS101',
      'business',
      'Turn market insight into clear positioning, goals, and execution plans.',
      'Explore competitive analysis, value propositions, and practical strategy tools used by growing teams. Map opportunities, prioritize bets, and translate strategy into quarterly objectives your team can ship against.',
      5990,
      '14',
      '/courses/software-developer.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Startup Operations & Leadership',
      'BUS201',
      'business',
      'Run day-to-day operations with clearer priorities, rituals, and team systems.',
      'Learn the operating rhythms of early-stage and scaling teams: hiring basics, meeting design, OKRs, cash awareness, and decision frameworks. Build habits that keep execution focused without drowning in process.',
      6490,
      '16',
      '/courses/service-design.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Financial Literacy for Founders',
      'BUS301',
      'business',
      'Read cash flow, unit economics, and simple forecasts with confidence.',
      'Get comfortable with founder-level finance: burn rate, runway, gross margin, pricing levers, and lightweight forecasting. Practice turning messy spreadsheet data into decisions you can explain to a team or investor.',
      5790,
      '13',
      '/courses/ux-ui-beginner.svg',
      'course-trailers/sample.mp4'
    ),
    (
      'Customer Discovery & Sales Basics',
      'BUS401',
      'business',
      'Validate demand with interviews, then run a simple first-sales process.',
      'Learn how to interview customers without biasing answers, synthesize pain points into offers, and run an early sales conversation from outreach to close. Focus on learning speed over polished pitch decks.',
      5190,
      '12',
      '/courses/software-developer.svg',
      'course-trailers/sample.mp4'
    )
) as seed (
  title,
  course_code,
  tag_slug,
  summary,
  description,
  price,
  total_learning_time,
  cover_image_url,
  video_trailer_url
)
where not exists (
  select 1
  from public.courses existing
  where lower(existing.course_code) = lower(seed.course_code)
);

-- ---------------------------------------------------------------------------
-- Lessons (3 per course — same pattern as create-course fixtures)
-- ---------------------------------------------------------------------------

insert into public.lessons (course_id, title, sort_order)
select c.id, lesson.title, lesson.sort_order
from public.courses c
join (
  values
    ('MKT101', 'Introduction', 0),
    ('MKT101', 'Channels & Funnel Basics', 1),
    ('MKT101', 'Campaign Measurement', 2),
    ('MKT201', 'Brand Narrative', 0),
    ('MKT201', 'Content Systems', 1),
    ('MKT201', 'Publish & Iterate', 2),
    ('MKT301', 'Platform Playbooks', 0),
    ('MKT301', 'Community & Engagement', 1),
    ('MKT301', 'Growth Analytics', 2),
    ('MKT401', 'Lifecycle Mapping', 0),
    ('MKT401', 'Sequence Design', 1),
    ('MKT401', 'Test & Improve', 2),
    ('BUS101', 'Market & Competition', 0),
    ('BUS101', 'Positioning & Goals', 1),
    ('BUS101', 'Execution Roadmap', 2),
    ('BUS201', 'Operating Rhythm', 0),
    ('BUS201', 'People & Priorities', 1),
    ('BUS201', 'Leadership Decisions', 2),
    ('BUS301', 'Cash & Runway', 0),
    ('BUS301', 'Unit Economics', 1),
    ('BUS301', 'Simple Forecasts', 2),
    ('BUS401', 'Customer Interviews', 0),
    ('BUS401', 'Offer Design', 1),
    ('BUS401', 'First Sales Loop', 2)
) as lesson (course_code, title, sort_order)
  on lower(c.course_code) = lower(lesson.course_code)
where not exists (
  select 1
  from public.lessons existing
  where existing.course_id = c.id
    and existing.title = lesson.title
    and existing.sort_order = lesson.sort_order
);

commit;
