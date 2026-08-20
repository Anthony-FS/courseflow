import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createMockSupabase,
  insertsFor,
} from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { POST as createCoursePost } from "@/app/api/admin/courses/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };

function validCourseBody(overrides = {}) {
  return {
    title: "Service Design Essentials",
    summary: "Learn service design fundamentals",
    description: "Detailed course content",
    price: 3559,
    totalLearningTime: "12",
    coverImageUrl: "course-covers/admin/cover.jpg",
    videoTrailerUrl: "course-trailers/admin/trailer.mp4",
    promo: null,
    attachment: null,
    lessons: [
      { title: "Introduction", sortOrder: 0 },
      { title: "Research", sortOrder: 1 },
      { title: "Prototype", sortOrder: 2 },
    ],
    ...overrides,
  };
}

async function postCreateCourse(body) {
  return createCoursePost(
    new Request("http://localhost/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/courses integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a course with promo, lessons, and attachment rows", async () => {
    const supabase = createMockSupabase({ courseId: "course-created-1" });
    requireAdmin.mockResolvedValue({
      supabase,
      user: ADMIN_USER,
      profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
      error: null,
    });

    const response = await postCreateCourse(
      validCourseBody({
        promo: {
          code: "NEWYEAR200",
          discountType: "thb",
          discountValue: 200,
          minPurchaseAmount: 0,
        },
        attachment: {
          name: "syllabus.pdf",
          fileUrl: "course-attachments/admin/syllabus.pdf",
          fileType: "application/pdf",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("course-created-1");

    const courseInsert = insertsFor(supabase, "courses")[0];
    expect(courseInsert.rows[0]).toMatchObject({
      created_by: ADMIN_USER.id,
      title: "Service Design Essentials",
      summary: "Learn service design fundamentals",
      description: "Detailed course content",
      price: 3559,
      total_learning_time: "12",
      cover_image_url: "course-covers/admin/cover.jpg",
      video_trailer_url: "course-trailers/admin/trailer.mp4",
    });

    const promoInsert = insertsFor(supabase, "promo_codes")[0];
    expect(promoInsert.rows[0]).toMatchObject({
      course_id: "course-created-1",
      code: "NEWYEAR200",
      discount_type: "fixed",
      discount_value: 200,
      min_purchase_amount: 0,
      is_active: true,
    });

    const lessonInsert = insertsFor(supabase, "lessons")[0];
    expect(lessonInsert.rows).toHaveLength(3);
    expect(lessonInsert.rows.map((row) => row.title)).toEqual([
      "Introduction",
      "Research",
      "Prototype",
    ]);

    const materialInsert = insertsFor(supabase, "materials")[0];
    expect(materialInsert.rows[0]).toMatchObject({
      course_id: "course-created-1",
      name: "syllabus.pdf",
      file_url: "course-attachments/admin/syllabus.pdf",
      sub_lesson_id: null,
    });
  });

  it("persists rearranged lesson order as sort_order in the database insert", async () => {
    const supabase = createMockSupabase({ courseId: "course-ordered-1" });
    requireAdmin.mockResolvedValue({
      supabase,
      user: ADMIN_USER,
      profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
      error: null,
    });

    // Simulate UI drag-and-drop: original [A,B,C] reordered to [C,A,B]
    const rearrangedLessons = [
      { title: "Prototype", sortOrder: 0 },
      { title: "Introduction", sortOrder: 1 },
      { title: "Research", sortOrder: 2 },
    ];

    const response = await postCreateCourse(
      validCourseBody({ lessons: rearrangedLessons }),
    );

    expect(response.status).toBe(201);

    const lessonInsert = insertsFor(supabase, "lessons")[0];
    expect(lessonInsert).toBeTruthy();
    expect(lessonInsert.rows).toEqual([
      {
        course_id: "course-ordered-1",
        title: "Prototype",
        sort_order: 0,
      },
      {
        course_id: "course-ordered-1",
        title: "Introduction",
        sort_order: 1,
      },
      {
        course_id: "course-ordered-1",
        title: "Research",
        sort_order: 2,
      },
    ]);

    // Order of rows and sort_order values must both match rearranged UI order
    expect(lessonInsert.rows.map((row) => row.sort_order)).toEqual([0, 1, 2]);
    expect(lessonInsert.rows.map((row) => row.title)).toEqual([
      "Prototype",
      "Introduction",
      "Research",
    ]);
  });

  it("returns 400 when required course fields are missing", async () => {
    const supabase = createMockSupabase();
    requireAdmin.mockResolvedValue({
      supabase,
      user: ADMIN_USER,
      profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
      error: null,
    });

    const response = await postCreateCourse({
      title: "",
      summary: "",
      description: "",
      price: -1,
      totalLearningTime: "",
      coverImageUrl: "",
      videoTrailerUrl: "",
      lessons: [],
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/missing or invalid required course fields/i);
    expect(insertsFor(supabase, "courses")).toHaveLength(0);
  });
});
