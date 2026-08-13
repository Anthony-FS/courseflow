async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
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
    throw new Error(data?.error || "Upload failed");
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
    throw new Error(data?.error || "Failed to create course");
  }

  return data;
}
