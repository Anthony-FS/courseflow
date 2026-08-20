import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  parseCoursePrice,
  parseLearningTime,
  mapDiscountTypeForDb,
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
  const summary = String(body.summary ?? "").trim();
  const description = String(body.description ?? "").trim();
  const totalLearningTime = String(body.totalLearningTime ?? "").trim();
  const coverImageUrl = String(body.coverImageUrl ?? "").trim();
  const videoTrailerUrl = String(body.videoTrailerUrl ?? "").trim();
  const price = parseCoursePrice(body.price);
  const learningTimeNumber = parseLearningTime(body.totalLearningTime);

  const fieldErrors = validateCourseFields({
    courseName: title,
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
    return jsonError(
      "Missing or invalid required course fields",
      400,
      {
        fields: fieldErrors,
        required: [
          "title",
          "summary",
          "description",
          "price",
          "totalLearningTime",
          "coverImageUrl",
          "videoTrailerUrl",
        ],
      },
    );
  }

  const lessons = Array.isArray(body.lessons) ? body.lessons : [];
  const promo = body.promo ?? null;
  const attachment = body.attachment ?? null;

  if (promo) {
    const code = String(promo.code ?? "").trim();
    const discountType = String(promo.discountType ?? "").trim();
    const discountValue = asNumber(promo.discountValue);
    const minPurchaseAmount = asNumber(promo.minPurchaseAmount ?? 0);
    const promoErrors = validatePromoFields({
      enabled: true,
      code,
      discountType,
      discountValue: promo.discountValue,
      price,
    });

    if (
      Object.keys(promoErrors).length > 0 ||
      !["thb", "percent"].includes(discountType) ||
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
    return jsonError(
      courseError?.message || "Failed to create course",
      500,
    );
  }

  const courseId = course.id;

  async function rollbackCourse() {
    await supabase.from("courses").delete().eq("id", courseId);
  }

  if (promo) {
    const { error: promoError } = await supabase.from("promo_codes").insert({
      course_id: courseId,
      code: String(promo.code).trim(),
      discount_type: mapDiscountTypeForDb(promo.discountType),
      discount_value: asNumber(promo.discountValue),
      min_purchase_amount: asNumber(promo.minPurchaseAmount ?? 0),
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
      title: String(lesson.title ?? "").trim() || `Lesson ${index + 1}`,
      sort_order:
        Number.isFinite(Number(lesson.sortOrder))
          ? Number(lesson.sortOrder)
          : index,
    }));

    const { error: lessonsError } = await supabase
      .from("lessons")
      .insert(lessonRows);

    if (lessonsError) {
      await rollbackCourse();
      return jsonError(lessonsError.message || "Failed to create lessons", 500);
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
