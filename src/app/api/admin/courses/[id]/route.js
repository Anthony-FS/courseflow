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

function mapDiscountTypeForUi(value) {
  const type = String(value ?? "").toLowerCase();
  if (type === "percent") return "percent";
  return "thb";
}

function mapCourse(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    summary: row.summary ?? "",
    description: row.description ?? "",
    price: row.price ?? 0,
    totalLearningTime: row.total_learning_time ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    videoTrailerUrl: row.video_trailer_url ?? "",
  };
}

function mapPromo(row) {
  if (!row) return null;

  return {
    id: row.id,
    code: row.code ?? "",
    discountType: mapDiscountTypeForUi(row.discount_type),
    discountValue: row.discount_value ?? 0,
    minPurchaseAmount: row.min_purchase_amount ?? 0,
  };
}

function mapAttachment(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name ?? "Attachment",
    fileUrl: row.file_url ?? "",
    fileType: row.file_type ?? "",
  };
}

function parseCourseUpdate(body) {
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const description = String(body.description ?? "").trim();
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
    return {
      error: jsonError("Missing or invalid required course fields", 400, {
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
      }),
    };
  }

  const promo = body.promo ?? null;
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
      return {
        error: jsonError("Invalid promo payload", 400, { fields: promoErrors }),
      };
    }
  }

  return {
    title,
    summary,
    description,
    price,
    learningTimeNumber,
    coverImageUrl,
    videoTrailerUrl,
    promo,
    attachment: body.attachment ?? null,
  };
}

async function getCourseLevelAttachment(supabase, courseId) {
  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, file_url, file_type, sub_lesson_id")
    .eq("course_id", courseId);

  const rows = Array.isArray(materials) ? materials : [];
  return rows.find((row) => row.sub_lesson_id == null) ?? null;
}

async function getCoursePromo(supabase, courseId) {
  const query = supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, min_purchase_amount")
    .eq("course_id", courseId);

  if (typeof query?.limit === "function") {
    const limited = query.limit(1);
    if (typeof limited?.maybeSingle === "function") {
      const { data } = await limited.maybeSingle();
      return data ?? null;
    }
    const result = await limited;
    const rows = Array.isArray(result?.data) ? result.data : [];
    return rows[0] ?? null;
  }

  if (typeof query?.maybeSingle === "function") {
    const { data } = await query.maybeSingle();
    return data ?? null;
  }

  const result = await query;
  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows[0] ?? null;
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) {
    return jsonError("Course id is required", 400);
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select(
      "id, title, summary, description, price, total_learning_time, cover_image_url, video_trailer_url",
    )
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    return jsonError(courseError.message || "Failed to load course", 500);
  }

  if (!course?.id) {
    return jsonError("Course not found", 404);
  }

  const [promo, attachment] = await Promise.all([
    getCoursePromo(supabase, courseId),
    getCourseLevelAttachment(supabase, courseId),
  ]);

  return jsonOk({
    ...mapCourse(course),
    promo: mapPromo(promo),
    attachment: mapAttachment(attachment),
  });
}

export async function PUT(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) {
    return jsonError("Course id is required", 400);
  }

  const { data: existingCourse } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (!existingCourse?.id) {
    return jsonError("Course not found", 404);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = parseCourseUpdate(body);
  if (parsed.error) return parsed.error;

  const { error: updateError } = await supabase
    .from("courses")
    .update({
      title: parsed.title,
      summary: parsed.summary,
      description: parsed.description,
      price: parsed.price,
      total_learning_time: String(parsed.learningTimeNumber),
      cover_image_url: parsed.coverImageUrl,
      video_trailer_url: parsed.videoTrailerUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (updateError) {
    return jsonError(updateError.message || "Failed to update course", 500);
  }

  const existingPromo = await getCoursePromo(supabase, courseId);

  if (parsed.promo) {
    const promoRow = {
      code: String(parsed.promo.code).trim(),
      discount_type: mapDiscountTypeForDb(parsed.promo.discountType),
      discount_value: asNumber(parsed.promo.discountValue),
      min_purchase_amount: asNumber(parsed.promo.minPurchaseAmount ?? 0),
      is_active: true,
    };

    if (existingPromo?.id) {
      const { error: promoError } = await supabase
        .from("promo_codes")
        .update(promoRow)
        .eq("id", existingPromo.id);

      if (promoError) {
        return jsonError(promoError.message || "Failed to update promo", 500);
      }
    } else {
      const { error: promoError } = await supabase.from("promo_codes").insert({
        course_id: courseId,
        ...promoRow,
      });

      if (promoError) {
        return jsonError(promoError.message || "Failed to create promo", 500);
      }
    }
  } else if (existingPromo?.id) {
    const { error: promoError } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", existingPromo.id);

    if (promoError) {
      return jsonError(promoError.message || "Failed to remove promo", 500);
    }
  }

  if (parsed.attachment?.fileUrl) {
    const existingAttachment = await getCourseLevelAttachment(supabase, courseId);
    const materialRow = {
      name: String(parsed.attachment.name ?? "Attachment").trim() || "Attachment",
      file_url: String(parsed.attachment.fileUrl),
      file_type: String(parsed.attachment.fileType ?? ""),
    };

    if (existingAttachment?.id) {
      const { error: materialError } = await supabase
        .from("materials")
        .update(materialRow)
        .eq("id", existingAttachment.id);

      if (materialError) {
        return jsonError(
          materialError.message || "Failed to update attachment",
          500,
        );
      }
    } else {
      const { error: materialError } = await supabase.from("materials").insert({
        course_id: courseId,
        sub_lesson_id: null,
        ...materialRow,
        content: null,
      });

      if (materialError) {
        return jsonError(
          materialError.message || "Failed to create attachment",
          500,
        );
      }
    }
  }

  return jsonOk({ id: courseId, success: true });
}


async function deleteByCourseId(supabase, table, courseId) {
  const { error } = await supabase.from(table).delete().eq("course_id", courseId);
  if (error) {
    return error;
  }
  return null;
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) {
    return jsonError("Course id is required", 400);
  }

  const subLessonError = await deleteByCourseId(
    supabase,
    "sub_lessons",
    courseId,
  );
  if (subLessonError) {
    return jsonError(
      subLessonError.message || "Failed to delete course sub-lessons",
      500,
    );
  }

  const lessonError = await deleteByCourseId(supabase, "lessons", courseId);
  if (lessonError) {
    return jsonError(
      lessonError.message || "Failed to delete course lessons",
      500,
    );
  }

  const { error: courseError } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (courseError) {
    return jsonError(courseError.message || "Failed to delete course", 500);
  }

  return jsonOk({ ok: true });
}
