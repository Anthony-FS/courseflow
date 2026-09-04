async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function putAssignmentSubmission(assignmentId, content) {
  const response = await fetch(
    `/api/assignments/${encodeURIComponent(assignmentId)}/submission`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data?.error || "Failed to save submission.");
  }
  return data;
}

export async function uploadAssignmentSubmissionFile(assignmentId, file) {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(
    `/api/assignments/${encodeURIComponent(assignmentId)}/submission/file`,
    { method: "POST", body: form },
  );
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data?.error || "Failed to upload file.");
  }
  return data;
}
