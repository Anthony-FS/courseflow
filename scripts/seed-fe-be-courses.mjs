/**
 * Seed Front-end (FE12) and Back-end (BE12) demo courses with 6 lessons
 * and sub-lessons each.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-fe-be-courses.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FRONTEND = {
  title: "Front-end Development",
  courseCode: "FE12",
  price: 12000,
  totalLearningTime: "12",
  summary:
    "Learn how to build modern, responsive websites with HTML, CSS, and JavaScript, then structure UI with reusable components.",
  description:
    "This course covers the core front-end stack from layout and styling to interactive UI. Students practice semantic HTML, CSS fundamentals and responsive design, JavaScript for DOM and logic, and component-based thinking used in modern web apps. By the end, learners can build multi-page interfaces, style them consistently, and connect basic user interactions ready for further framework study.",
  lessons: [
    {
      title: "Introduction to Front-end",
      subLessons: [
        "Welcome to Front-end",
        "How the Web Works",
        "Tools and Setup",
        "Your First Page",
        "Browser DevTools Basics",
        "Module Recap",
      ],
    },
    {
      title: "HTML Structure and Semantics",
      subLessons: [
        "HTML Document Structure",
        "Semantic Elements",
        "Forms and Inputs",
        "Accessibility Basics",
        "Media Elements",
        "Practice: Build a Landing Page",
      ],
    },
    {
      title: "CSS Layout and Responsive Design",
      subLessons: [
        "Selectors and Cascade",
        "Box Model and Spacing",
        "Flexbox Layouts",
        "CSS Grid",
        "Responsive Breakpoints",
        "Practice: Responsive Card Layout",
      ],
    },
    {
      title: "JavaScript Fundamentals",
      subLessons: [
        "Variables and Types",
        "Functions and Scope",
        "Arrays and Objects",
        "Conditionals and Loops",
        "ES Modules Basics",
        "Practice: Small Utilities",
      ],
    },
    {
      title: "DOM and Interactive UI",
      subLessons: [
        "Selecting and Updating DOM",
        "Events and Handlers",
        "Forms and Validation",
        "Fetching Data",
        "UI State Patterns",
        "Component Thinking",
        "Practice: Interactive Todo",
      ],
    },
    {
      title: "Course Summary",
      subLessons: [
        "What You Built",
        "Front-end Checklist",
        "Common Pitfalls",
        "Next Steps with Frameworks",
        "Portfolio Tips",
        "Final Review",
      ],
    },
  ],
};

const BACKEND = {
  title: "Back-end Development",
  courseCode: "BE12",
  price: 12000,
  totalLearningTime: "12",
  summary:
    "Learn how servers, APIs, and databases work together so you can build secure, data-driven back-end applications.",
  description:
    "This course introduces back-end fundamentals including HTTP, REST APIs, server-side logic, authentication basics, and working with databases. Students practice designing endpoints, handling requests and responses, validating input, and storing data reliably. By the end, learners can build a simple API-backed service and understand how front-end clients consume it.",
  lessons: [
    {
      title: "Introduction to Back-end",
      subLessons: [
        "Welcome to Back-end",
        "Client vs Server",
        "Environments and Tooling",
        "Your First Server",
        "Logging and Debugging",
        "Module Recap",
      ],
    },
    {
      title: "HTTP and REST APIs",
      subLessons: [
        "HTTP Methods and Status Codes",
        "Request and Response Bodies",
        "REST Resource Design",
        "Query Params and Headers",
        "Error Response Patterns",
        "Practice: Design an API",
      ],
    },
    {
      title: "Server-side Logic and Routing",
      subLessons: [
        "Routing Basics",
        "Middleware Concepts",
        "Input Validation",
        "Service Layer Pattern",
        "Handling Async Work",
        "Practice: CRUD Endpoints",
      ],
    },
    {
      title: "Databases and Data Modeling",
      subLessons: [
        "Relational Basics",
        "Tables and Relationships",
        "Migrations Overview",
        "Queries and Filters",
        "Transactions Intro",
        "Practice: Model a Blog",
      ],
    },
    {
      title: "Auth and Security Basics",
      subLessons: [
        "Auth vs Authorization",
        "Sessions and Tokens",
        "Password Hashing",
        "Protecting Routes",
        "CORS and Common Threats",
        "Rate Limiting Basics",
        "Practice: Secure an Endpoint",
      ],
    },
    {
      title: "Course Summary",
      subLessons: [
        "Architecture Recap",
        "API Checklist",
        "Security Checklist",
        "Deploying Basics",
        "Working with Front-end Clients",
        "Final Review",
      ],
    },
  ],
};

async function resolveCreatedBy() {
  const { data: admin } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (admin?.id) return admin.id;

  const { data: anyProfile } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();

  return anyProfile?.id ?? null;
}

async function resolveMediaUrls() {
  const { data: donor } = await supabase
    .from("courses")
    .select("cover_image_url, video_trailer_url")
    .eq("course_code", "BP12")
    .maybeSingle();

  return {
    coverImageUrl:
      donor?.cover_image_url || "course-covers/sample.jpg",
    videoTrailerUrl:
      donor?.video_trailer_url || "course-trailers/sample.mp4",
  };
}

async function seedCourse(spec, createdBy, media) {
  const { data: existing } = await supabase
    .from("courses")
    .select("id, course_code")
    .ilike("course_code", spec.courseCode)
    .maybeSingle();

  if (existing?.id) {
    console.log(`Skip ${spec.courseCode} — already exists (${existing.id})`);
    return existing.id;
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      created_by: createdBy,
      title: spec.title,
      course_code: spec.courseCode,
      summary: spec.summary,
      description: spec.description,
      price: spec.price,
      total_learning_time: spec.totalLearningTime,
      cover_image_url: media.coverImageUrl,
      video_trailer_url: media.videoTrailerUrl,
    })
    .select("id")
    .single();

  if (courseError || !course) {
    throw new Error(
      `Failed to create ${spec.courseCode}: ${courseError?.message || "unknown"}`,
    );
  }

  for (let lessonIndex = 0; lessonIndex < spec.lessons.length; lessonIndex++) {
    const lesson = spec.lessons[lessonIndex];
    const { data: createdLesson, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        course_id: course.id,
        title: lesson.title,
        sort_order: lessonIndex,
      })
      .select("id")
      .single();

    if (lessonError || !createdLesson) {
      throw new Error(
        `Failed to create lesson "${lesson.title}": ${lessonError?.message}`,
      );
    }

    const subRows = lesson.subLessons.map((title, subIndex) => ({
      course_id: course.id,
      lesson_id: createdLesson.id,
      title,
      sort_order: subIndex + 1,
      is_preview: false,
    }));

    const { error: subError } = await supabase.from("sub_lessons").insert(subRows);
    if (subError) {
      throw new Error(
        `Failed to create sub-lessons for "${lesson.title}": ${subError.message}`,
      );
    }
  }

  console.log(
    `Created ${spec.courseCode} (${course.id}) with ${spec.lessons.length} lessons`,
  );
  return course.id;
}

const createdBy = await resolveCreatedBy();
const media = await resolveMediaUrls();

console.log("Seeding with media from:", media.coverImageUrl ? "BP12 or fallback" : "fallback");

await seedCourse(FRONTEND, createdBy, media);
await seedCourse(BACKEND, createdBy, media);

console.log("Done.");
