import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createMockSupabase,
  insertsFor,
  updatesFor,
} from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import {
  GET as getCourse,
  PUT as updateCourse,
} from "@/app/api/admin/courses/[id]/route";
import {
  PUT as updateLesson,
  DELETE as deleteLesson,
} from "@/app/api/admin/courses/[id]/lessons/[lessonId]/route";

const ADMIN_USER = { id: "11111111-1111-1111-1111-111111111111" };
const COURSE_ID = "200171d7-7676-4c2e-a72b-92f7979181cc";
const LESSON_ID = "11111111-1111-1111-1111-111111111111";

const COURSE_ROW = {
  id: COURSE_ID,
  title: "Service Design Essentials",
  course_code: "SD101",
  summary: "Learn service design fundamentals",
  description: "Detailed course content",
  price: 3559,
  total_learning_time: "12",
  cover_image_url: "course-covers/admin/cover.jpg",
  video_trailer_url: "course-trailers/admin/trailer.mp4",
};

function validUpdateBody(overrides = {}) {
  return {
    title: "Service Design Essentials",
    courseCode: "SD101",
    summary: "Learn service design fundamentals",
    description: "Detailed course content",
    price: 3559,
    totalLearningTime: "12",
    coverImageUrl: "course-covers/admin/cover.jpg",
    videoTrailerUrl: "course-trailers/admin/trailer.mp4",
    promo: null,
    attachment: null,
    ...overrides,
  };
}

function mockAdmin(supabase) {
  requireAdmin.mockResolvedValue({
    supabase,
    user: ADMIN_USER,
    profile: { id: ADMIN_USER.id, role: "admin", is_active: true },
    error: null,
  });
}

async function putCourse(courseId, body) {
  return updateCourse(
    new Request(`http://localhost/api/admin/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: courseId }) },
  );
}

describe("GET /api/admin/courses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns course details with promo and attachment", async () => {
    const supabase = createMockSupabase({
      courseSelect: COURSE_ROW,
      promoSelect: {
        id: "promo-1",
        code: "NEWYEAR200",
        discount_type: "fixed",
        discount_value: 200,
        min_purchase_amount: 0,
      },
      materialsSelect: [
        {
          id: "mat-1",
          name: "syllabus.pdf",
          file_url: "course-attachments/admin/syllabus.pdf",
          file_type: "application/pdf",
          sub_lesson_id: null,
        },
        {
          id: "mat-2",
          name: "lesson-video.mp4",
          file_url: "lesson-videos/clip.mp4",
          file_type: "video/mp4",
          sub_lesson_id: "sub-1",
        },
      ],
    });
    mockAdmin(supabase);

    const response = await getCourse(
      new Request(`http://localhost/api/admin/courses/${COURSE_ID}`),
      { params: Promise.resolve({ id: COURSE_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: COURSE_ID,
      title: "Service Design Essentials",
      courseCode: "SD101",
      summary: "Learn service design fundamentals",
      totalLearningTime: "12",
      coverImageUrl: "course-covers/admin/cover.jpg",
      promo: {
        id: "promo-1",
        code: "NEWYEAR200",
        discountType: "thb",
        discountValue: 200,
      },
      attachment: {
        name: "syllabus.pdf",
        fileUrl: "course-attachments/admin/syllabus.pdf",
      },
    });
  });

  it("returns 404 when the course does not exist", async () => {
    const supabase = createMockSupabase({ courseSelect: null });
    mockAdmin(supabase);

    const response = await getCourse(
      new Request(`http://localhost/api/admin/courses/${COURSE_ID}`),
      { params: Promise.resolve({ id: COURSE_ID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });
});

describe("PUT /api/admin/courses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates course fields and stamps updated_at", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({
        title: "Updated Course",
        price: 1999,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(COURSE_ID);

    const courseUpdate = updatesFor(supabase, "courses")[0];
    expect(courseUpdate.payload).toMatchObject({
      title: "Updated Course",
      course_code: "SD101",
      price: 1999,
      cover_image_url: "course-covers/admin/cover.jpg",
      video_trailer_url: "course-trailers/admin/trailer.mp4",
    });
    expect(courseUpdate.payload.updated_at).toEqual(expect.any(String));
  });

  it("removes previous media from storage when cover/trailer/attachment change", async () => {
    const supabase = createMockSupabase({
      courseSelect: COURSE_ROW,
      materialsSelect: [
        {
          id: "mat-1",
          name: "syllabus.pdf",
          file_url: "course-attachments/admin/old-notes.pdf",
          file_type: "application/pdf",
          sub_lesson_id: null,
          course_id: COURSE_ID,
        },
      ],
    });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({
        coverImageUrl: "course-covers/admin/new-cover.jpg",
        videoTrailerUrl: "course-trailers/admin/new-trailer.mp4",
        attachment: {
          name: "new-notes.pdf",
          fileUrl: "course-attachments/admin/new-notes.pdf",
          fileType: "application/pdf",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.storageRemoves).toEqual(
      expect.arrayContaining([
        { bucket: "course-covers", paths: ["admin/cover.jpg"] },
        { bucket: "course-trailers", paths: ["admin/trailer.mp4"] },
        { bucket: "course-attachments", paths: ["admin/old-notes.pdf"] },
      ]),
    );
  });

  it("does not remove media when urls stay the same", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    const response = await putCourse(COURSE_ID, validUpdateBody());

    expect(response.status).toBe(200);
    expect(supabase.storageRemoves).toEqual([]);
  });

  it("allows keeping the same course code with different casing", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({ courseCode: "sd101" }),
    );

    expect(response.status).toBe(200);
    expect(updatesFor(supabase, "courses")[0].payload.course_code).toBe(
      "sd101",
    );
  });

  it("preserves mixed casing when updating course code", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({ courseCode: "LOL404" }),
    );

    expect(response.status).toBe(200);
    expect(updatesFor(supabase, "courses")[0].payload.course_code).toBe(
      "LOL404",
    );
  });

  it("returns 400 when clearing course code to empty or whitespace", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    for (const courseCode of ["", "   ", "\t"]) {
      const response = await putCourse(
        COURSE_ID,
        validUpdateBody({ courseCode }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.fields.courseCode).toMatch(/fill out this field/i);
    }

    expect(updatesFor(supabase, "courses")).toHaveLength(0);
  });

  it("returns 409 when course code collides with another course", async () => {
    const supabase = createMockSupabase({
      courseSelect: [
        COURSE_ROW,
        { id: "other-course", course_code: "FSD12" },
      ],
    });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({ courseCode: "fsd12" }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already exists/i);
    expect(body.fields.courseCode).toMatch(/already exists/i);
    expect(updatesFor(supabase, "courses")).toHaveLength(0);
  });

  it("upserts an existing promo and keeps existing media urls", async () => {
    const supabase = createMockSupabase({
      courseSelect: COURSE_ROW,
      promoSelect: {
        id: "promo-1",
        code: "OLDCODE",
        discount_type: "fixed",
        discount_value: 100,
        min_purchase_amount: 0,
      },
    });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({
        coverImageUrl: COURSE_ROW.cover_image_url,
        videoTrailerUrl: COURSE_ROW.video_trailer_url,
        promo: {
          code: "NEWYEAR200",
          discountType: "thb",
          discountValue: 200,
          minPurchaseAmount: 0,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(insertsFor(supabase, "promo_codes")).toHaveLength(0);

    const promoUpdate = updatesFor(supabase, "promo_codes")[0];
    expect(promoUpdate.payload).toMatchObject({
      code: "NEWYEAR200",
      discount_type: "fixed",
      discount_value: 200,
    });
  });

  it("inserts a promo with discount_type fixed when the UI sends thb", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    const response = await putCourse(
      COURSE_ID,
      validUpdateBody({
        promo: {
          code: "NEWYEAR200",
          discountType: "thb",
          discountValue: 200,
          minPurchaseAmount: 0,
        },
      }),
    );

    expect(response.status).toBe(200);
    const promoInsert = insertsFor(supabase, "promo_codes")[0];
    expect(promoInsert.rows[0]).toMatchObject({
      course_id: COURSE_ID,
      code: "NEWYEAR200",
      discount_type: "fixed",
      discount_value: 200,
    });
  });

  it("returns 400 when required course fields are missing", async () => {
    const supabase = createMockSupabase({ courseSelect: COURSE_ROW });
    mockAdmin(supabase);

    const response = await putCourse(COURSE_ID, {
      title: "",
      courseCode: "",
      summary: "",
      description: "",
      price: -1,
      totalLearningTime: "",
      coverImageUrl: "",
      videoTrailerUrl: "",
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/missing or invalid required course fields/i);
    expect(updatesFor(supabase, "courses")).toHaveLength(0);
  });

  it("returns 404 when updating a missing course", async () => {
    const supabase = createMockSupabase({ courseSelect: null });
    mockAdmin(supabase);

    const response = await putCourse(COURSE_ID, validUpdateBody());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });
});

describe("lesson mutations touch courses.updated_at", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stamps the course when a lesson is updated", async () => {
    const supabase = createMockSupabase({
      courseSelect: { id: COURSE_ID },
    });
    mockAdmin(supabase);

    const response = await updateLesson(
      new Request(
        `http://localhost/api/admin/courses/${COURSE_ID}/lessons/${LESSON_ID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonName: "Updated lesson",
            subLessons: [{ title: "Sub 1" }],
          }),
        },
      ),
      { params: Promise.resolve({ id: COURSE_ID, lessonId: LESSON_ID }) },
    );

    expect(response.status).toBe(200);
    const courseTouch = updatesFor(supabase, "courses").find((entry) =>
      Object.prototype.hasOwnProperty.call(entry.payload, "updated_at"),
    );
    expect(courseTouch).toBeTruthy();
  });

  it("stamps the course when a lesson is deleted", async () => {
    const supabase = createMockSupabase({
      courseSelect: { id: COURSE_ID },
    });
    mockAdmin(supabase);

    const response = await deleteLesson(
      new Request(
        `http://localhost/api/admin/courses/${COURSE_ID}/lessons/${LESSON_ID}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: COURSE_ID, lessonId: LESSON_ID }) },
    );

    expect(response.status).toBe(200);
    const courseTouch = updatesFor(supabase, "courses").find((entry) =>
      Object.prototype.hasOwnProperty.call(entry.payload, "updated_at"),
    );
    expect(courseTouch).toBeTruthy();
  });
});
