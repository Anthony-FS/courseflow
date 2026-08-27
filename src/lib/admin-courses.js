async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createApiError(data, fallback) {
  const error = new Error(data?.error || fallback);
  if (data?.fields && typeof data.fields === "object") {
    error.fields = data.fields;
  }
  return error;
}

export async function uploadAdminFile(kind, file) {
  const formData = new FormData();
  formData.set("kind", kind);
  formData.set("file", file);

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: formData,
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Upload failed");
  }

  return data;
}

export async function createAdminCourse(payload) {
  const response = await fetch("/api/admin/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to create course");
  }

  return data;
}

export async function getAdminCoursesPage({
  query = "",
  page = 1,
  pageSize = 10,
  sortBy = "courseCode",
  sortDirection = "asc",
} = {}) {
  const params = new URLSearchParams({ q: query, page: String(page), pageSize: String(pageSize), sortBy, sortDirection });
  const response = await fetch(`/api/admin/courses?${params}`, { cache: "no-store" });
  const data = await parseJson(response);
  if (!response.ok) throw createApiError(data, "Failed to load courses");
  return data;
}

export async function getAdminCourse(courseId) {
  const response = await fetch(`/api/admin/courses/${courseId}`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to load course");
  }

  return data;
}

export async function updateAdminCourse(courseId, payload) {
  const response = await fetch(`/api/admin/courses/${courseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to update course");
  }

  return data;
}

export async function getAdminCourseLessons(courseId) {
  const response = await fetch(`/api/admin/courses/${courseId}/lessons`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to load lessons");
  }

  return Array.isArray(data?.lessons) ? data.lessons : [];
}

export async function createAdminLesson(courseId, payload) {
  const response = await fetch(`/api/admin/courses/${courseId}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to create lesson");
  }

  return data;
}

export async function getAdminLessonDetail(courseId, lessonId) {
  const response = await fetch(
    `/api/admin/courses/${courseId}/lessons/${lessonId}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to load lesson detail");
  }

  return data?.lesson || null;
}

export async function updateAdminLesson(courseId, lessonId, payload) {
  const response = await fetch(
    `/api/admin/courses/${courseId}/lessons/${lessonId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to update lesson");
  }

  return data;
}

export async function deleteAdminLesson(courseId, lessonId) {
  const response = await fetch(
    `/api/admin/courses/${courseId}/lessons/${lessonId}`,
    {
      method: "DELETE",
    },
  );
  const data = await parseJson(response);

  if (!response.ok) {
    throw createApiError(data, "Failed to delete lesson");
  }

  return data;
}
