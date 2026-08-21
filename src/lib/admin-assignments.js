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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to create assignment");
  }

  return data;
}

export async function getAdminAssignment(id) {
  const response = await fetch(
    `/api/admin/assignments/${encodeURIComponent(id)}`,
  );

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to load assignment");
  }

  return data.assignment;
}

export async function updateAdminAssignment(id, payload) {
  const response = await fetch(
    `/api/admin/assignments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to update assignment");
  }

  return data;
}

export async function deleteAdminAssignment(id) {
  const response = await fetch(
    `/api/admin/assignments/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete assignment");
  }

  return data;
}