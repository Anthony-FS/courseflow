import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, jsonTooManyRequests } from "@/lib/api";
import {
  ADMIN_SEARCH_RATE_LIMIT,
  ADMIN_SEARCH_RATE_WINDOW_MS,
  adminSearchRateLimitKey,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { resolveCoverUrl } from "@/lib/courses";
import {
  COURSE_CODE_TAKEN_MESSAGE,
  DEFAULT_COURSE_TAG,
  findCourseWithCode,
  isUniqueViolation,
  normalizeCourseTag,
  parseCoursePrice,
  parseLearningTime,
  mapDiscountTypeForDb,
  resolveCourseTagId,
  trimCourseCode,
  validateCourseFields,
  validatePromoFields,
} from "@/lib/course-validation";

const ADMIN_COURSE_COLUMNS =
  "id, title, course_code, cover_file_url, cover_file_type, cover_image_url, price, is_active, created_at, updated_at, lessons(count)";

const COURSE_SORT_COLUMNS = {
  courseCode: "course_code",
  title: "title",
  price: "price",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function mapAdminCourse(row) {
  const lessons = row?.lessons;
  const lessonCount = Array.isArray(lessons)
    ? lessons[0]?.count ?? lessons.length
    : lessons?.count ?? 0;

  return {
    id: row.id,
    title: row.title,
    course_code: row.course_code ?? "",
    cover_file_url: resolveCoverUrl(row.cover_image_url || row.cover_file_url),
    cover_file_type: row.cover_file_type,
    price: row.price ?? 0,
    lesson_count: lessonCount,
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function GET(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const limited = checkRateLimit(adminSearchRateLimitKey(getClientIp(request)), {
    limit: ADMIN_SEARCH_RATE_LIMIT,
    windowMs: ADMIN_SEARCH_RATE_WINDOW_MS,
  });
  if (!limited.allowed) {
    return jsonTooManyRequests(limited.retryAfterSec);
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
  const query = String(searchParams.get("q") ?? "").trim();
  const sortBy = COURSE_SORT_COLUMNS[searchParams.get("sortBy")] ?? "course_code";
  const ascending = searchParams.get("sortDirection") !== "desc";
  const statusFilter = searchParams.get("status") ?? "all";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let requestQuery = supabase
    .from("courses")
    .select(ADMIN_COURSE_COLUMNS, { count: "exact" });

  if (query) {
    const escaped = query.replace(/[(),"]/g, " ").replaceAll("%", "\\%").replaceAll("_", "\\_");
    requestQuery = requestQuery.or(`title.ilike.%${escaped}%,course_code.ilike.%${escaped}%`);
  }

  if (statusFilter === "active") {
    requestQuery = requestQuery.eq("is_active", true);
  } else if (statusFilter === "inactive") {
    requestQuery = requestQuery.eq("is_active", false);
  }

  const { data, count, error: queryError } = await requestQuery
    .order(sortBy, { ascending })
    .range(from, to);

  if (queryError) return jsonError(queryError.message || "Failed to load courses", 500);

  return jsonOk({ courses: (data ?? []).map(mapAdminCourse), total: count ?? 0, page, pageSize });
}

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(request) {
  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const title = String(body.title ?? "").trim();
  const courseCode = trimCourseCode(body.courseCode);
  const tag = normalizeCourseTag(body.tag ?? DEFAULT_COURSE_TAG);
  const summary = String(body.summary ?? "").trim();
  const description = String(body.description ?? "").trim();
  const coverImageUrl = String(body.coverImageUrl ?? "").trim();
  const videoTrailerUrl = String(body.videoTrailerUrl ?? "").trim();
  const price = parseCoursePrice(body.price);
  const learningTimeNumber = parseLearningTime(body.totalLearningTime);

  const fieldErrors = validateCourseFields({
    courseName: title,
    courseCode,
    tag,
    price: body.price,
    learningTime: body.totalLearningTime,
    courseSummary: summary,
    courseDetail: description,
  });

  if (
    Object.keys(fieldErrors).length > 0 ||
    isBlank(coverImageUrl) ||
    isBlank(videoTrailerUrl) ||
    !Number.isFinite(price) ||
    !Number.isFinite(learningTimeNumber)
  ) {
    return jsonError("Missing or invalid required course fields", 400, {
      fields: fieldErrors,
      required: [
        "title",
        "courseCode",
        "tag",
        "summary",
        "description",
        "price",
        "totalLearningTime",
        "coverImageUrl",
        "videoTrailerUrl",
      ],
    });
  }

  try {
    const existing = await findCourseWithCode(supabase, courseCode);
    if (existing) {
      return jsonError(COURSE_CODE_TAKEN_MESSAGE, 409, {
        fields: { courseCode: COURSE_CODE_TAKEN_MESSAGE },
      });
    }
  } catch (lookupError) {
    return jsonError(
      lookupError?.message || "Failed to validate course code",
      500,
    );
  }

  let tagId;
  try {
    tagId = await resolveCourseTagId(supabase, tag);
  } catch (tagError) {
    return jsonError(tagError?.message || "Failed to resolve course tag", 500);
  }

  if (!tagId) {
    return jsonError("Missing or invalid required course fields", 400, {
      fields: { tag: "Please select a valid course tag" },
      required: ["tag"],
    });
  }

  const lessons = Array.isArray(body.lessons) ? body.lessons : [];
  const promo = body.promo ?? null;
  const attachment = body.attachment ?? null;

  if (promo) {
    const code = String(promo.code ?? "").trim().toUpperCase();
    const requestedDiscountType = String(promo.discountType ?? "").trim();
    const discountType =
      requestedDiscountType === "thb" ? "fixed" : requestedDiscountType;
    const discountValue = asNumber(promo.discountValue);
    const minPurchaseAmount = asNumber(promo.minPurchaseAmount ?? 0);
    const promoErrors = validatePromoFields({
      enabled: true,
      code,
      discountType: requestedDiscountType,
      discountValue: promo.discountValue,
      price,
    });

    if (
      Object.keys(promoErrors).length > 0 ||
      !["fixed", "percent"].includes(discountType) ||
      !Number.isFinite(discountValue) ||
      discountValue < 0 ||
      !Number.isFinite(minPurchaseAmount) ||
      minPurchaseAmount < 0
    ) {
      return jsonError("Invalid promo payload", 400, { fields: promoErrors });
    }
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      created_by: user.id,
      title,
      course_code: courseCode,
      tag_id: tagId,
      summary,
      description,
      price,
      total_learning_time: String(learningTimeNumber),
      cover_image_url: coverImageUrl,
      video_trailer_url: videoTrailerUrl,
      is_active: true,
    })
    .select("id")
    .single();

  if (courseError || !course) {
    if (isUniqueViolation(courseError)) {
      return jsonError(COURSE_CODE_TAKEN_MESSAGE, 409, {
        fields: { courseCode: COURSE_CODE_TAKEN_MESSAGE },
      });
    }
    return jsonError(courseError?.message || "Failed to create course", 500);
  }

  const courseId = course.id;

  async function rollbackCourse() {
    await supabase.from("courses").delete().eq("id", courseId);
  }

  if (promo) {
    const { error: promoError } = await supabase.from("promo_codes").insert({
      course_id: courseId,
      code: String(promo.code ?? "").trim().toUpperCase(),
      discount_type: mapDiscountTypeForDb(promo.discountType),
      discount_value: asNumber(promo.discountValue),
      min_purchase_amount: asNumber(promo.minPurchaseAmount ?? 0),
      starts_at: new Date().toISOString(),
      is_active: true,
    });

    if (promoError) {
      await rollbackCourse();
      return jsonError(promoError.message || "Failed to create promo", 500);
    }
  }

  if (lessons.length > 0) {
    const lessonRows = lessons.map((lesson, index) => ({
      course_id: courseId,
      title:
        String(lesson.title ?? lesson.name ?? "").trim() ||
        `Lesson ${index + 1}`,
      sort_order: Number.isFinite(Number(lesson.sortOrder))
        ? Number(lesson.sortOrder)
        : index,
    }));

    const { data: createdLessons, error: lessonsError } = await supabase
      .from("lessons")
      .insert(lessonRows)
      .select("id, sort_order");

    if (lessonsError) {
      await rollbackCourse();
      return jsonError(lessonsError.message || "Failed to create lessons", 500);
    }

    if (Array.isArray(createdLessons) && createdLessons.length > 0) {
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const matchingCreated =
          createdLessons.find((cl) => cl.sort_order === i) || createdLessons[i];
        const subLessons = Array.isArray(lesson.subLessons)
          ? lesson.subLessons
          : [];

        if (!matchingCreated?.id) continue;

        for (let subIdx = 0; subIdx < subLessons.length; subIdx++) {
          const sub = subLessons[subIdx];
          const { data: subLesson, error: subError } = await supabase
            .from("sub_lessons")
            .insert({
              course_id: courseId,
              lesson_id: matchingCreated.id,
              title:
                String(sub.title ?? "").trim() || `Sub-lesson ${subIdx + 1}`,
              description: sub.description ? String(sub.description).trim() : null,
              sort_order: subIdx + 1,
              is_preview: Boolean(sub.isPreview),
            })
            .select("id")
            .single();

          if (subError || !subLesson) continue;

          if (sub.videoUrl) {
            await supabase.from("materials").insert({
              course_id: courseId,
              sub_lesson_id: subLesson.id,
              name: String(sub.videoName || `${sub.title} Video`).trim(),
              file_url: String(sub.videoUrl),
              file_type: "video/mp4",
            });
          }

          if (sub.attachmentUrl) {
            await supabase.from("materials").insert({
              course_id: courseId,
              sub_lesson_id: subLesson.id,
              name: String(sub.attachmentName || `${sub.title} Attachment`).trim(),
              file_url: String(sub.attachmentUrl),
              file_type: String(sub.attachmentType || "application/pdf"),
            });
          }
        }
      }
    }
  }

  if (attachment?.fileUrl) {
    const { error: materialError } = await supabase.from("materials").insert({
      course_id: courseId,
      sub_lesson_id: null,
      name: String(attachment.name ?? "Attachment").trim() || "Attachment",
      file_url: String(attachment.fileUrl),
      file_type: String(attachment.fileType ?? ""),
      content: null,
    });

    if (materialError) {
      await rollbackCourse();
      return jsonError(
        materialError.message || "Failed to create attachment",
        500,
      );
    }
  }

  revalidateTag("courses", { expire: 0 });
  return jsonOk({ id: courseId }, { status: 201 });
}
