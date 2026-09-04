import { formatCourseDate } from "@/lib/format";

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function applyAdminAssignmentStatus(assignments, result) {
  return assignments.map((assignment) =>
    assignment.id === result.id
      ? {
          ...assignment,
          is_active: result.is_active,
          updatedDateLabel: result.updated_at
            ? formatCourseDate(result.updated_at)
            : assignment.updatedDateLabel,
        }
      : assignment,
  );
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

export async function updateAdminAssignmentStatus(id, isActive) {
  const response = await fetch(
    `/api/admin/assignments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    },
  );

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to update assignment status");
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

export async function getAdminAssignmentsPage({
  query = "",
  page = 1,
  pageSize = 10,
  sortBy = "updatedAt",
  sortDirection = "desc",
  status = "all",
} = {}) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortDirection,
    status,
  });
  const response = await fetch(`/api/admin/assignments?${params}`, { cache: "no-store" });
  const data = await parseJson(response);
  if (!response.ok) throw new Error(data?.error || "Failed to load assignments");
  return data;
}
