import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  COURSE_CODE_TAKEN_MESSAGE,
  findCourseWithCode,
  isUniqueViolation,
  parseCoursePrice,
  parseLearningTime,
  mapDiscountTypeForDb,
  trimCourseCode,
  validateCourseFields,
  validatePromoFields,
} from "@/lib/course-validation";

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
  const summary = String(body.summary ?? "").trim();
  const description = String(body.description ?? "").trim();
  const coverImageUrl = String(body.coverImageUrl ?? "").trim();
  const videoTrailerUrl = String(body.videoTrailerUrl ?? "").trim();
  const price = parseCoursePrice(body.price);
  const learningTimeNumber = parseLearningTime(body.totalLearningTime);

  const fieldErrors = validateCourseFields({
    courseName: title,
    courseCode,
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
      summary,
      description,
      price,
      total_learning_time: String(learningTimeNumber),
      cover_image_url: coverImageUrl,
      video_trailer_url: videoTrailerUrl,
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

  return jsonOk({ id: courseId }, { status: 201 });
}
