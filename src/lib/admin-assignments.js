async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function createAdminAssignment(payload) {
  const response = await fetch("/api/admin/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to create assignment");
  }

  return data;
}
