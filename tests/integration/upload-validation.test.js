import { describe, expect, it, vi, beforeEach } from "vitest";

import { validateUpload, UPLOAD_KINDS } from "@/lib/admin-uploads";
import { createMockSupabase } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { POST as uploadPost } from "@/app/api/admin/uploads/route";

function makeFile({
  name = "cover.jpg",
  type = "image/jpeg",
  sizeBytes = 1024,
} = {}) {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

describe("upload media type and size validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported cover mime type", () => {
    const file = makeFile({ name: "notes.pdf", type: "application/pdf" });
    const result = validateUpload("cover", file);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/unsupported file type/i);
  });

  it("rejects cover image over 5 MB", () => {
    const file = makeFile({
      name: "big.jpg",
      type: "image/jpeg",
      sizeBytes: UPLOAD_KINDS.cover.maxBytes + 1,
    });
    const result = validateUpload("cover", file);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/exceeds max size of 5 MB/i);
  });

  it("rejects unsupported trailer mime type", () => {
    const file = makeFile({ name: "clip.webm", type: "video/webm" });
    const result = validateUpload("trailer", file);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/unsupported file type/i);
  });

  it("rejects trailer video over 20 MB", () => {
    const file = makeFile({
      name: "long.mp4",
      type: "video/mp4",
      sizeBytes: UPLOAD_KINDS.trailer.maxBytes + 1,
    });
    const result = validateUpload("trailer", file);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/exceeds max size of 20 MB/i);
  });

  it("accepts valid cover jpeg under size limit", () => {
    const file = makeFile({
      name: "ok.jpg",
      type: "image/jpeg",
      sizeBytes: 2048,
    });
    const result = validateUpload("cover", file);

    expect(result.ok).toBe(true);
    expect(result.config.bucket).toBe("course-covers");
  });

  it("POST /api/admin/uploads returns 400 for invalid mime before storage upload", async () => {
    const supabase = createMockSupabase();
    requireAdmin.mockResolvedValue({
      supabase,
      user: { id: "admin-user" },
      profile: { role: "admin", is_active: true },
      error: null,
    });

    const formData = new FormData();
    formData.set("kind", "cover");
    formData.set(
      "file",
      makeFile({ name: "bad.gif", type: "image/gif", sizeBytes: 100 }),
    );

    const response = await uploadPost(
      new Request("http://localhost/api/admin/uploads", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/unsupported file type/i);
    expect(supabase.uploads).toHaveLength(0);
  });

  it("POST /api/admin/uploads returns 400 for oversized trailer before storage upload", async () => {
    const supabase = createMockSupabase();
    requireAdmin.mockResolvedValue({
      supabase,
      user: { id: "admin-user" },
      profile: { role: "admin", is_active: true },
      error: null,
    });

    const formData = new FormData();
    formData.set("kind", "trailer");
    formData.set(
      "file",
      makeFile({
        name: "huge.mp4",
        type: "video/mp4",
        sizeBytes: UPLOAD_KINDS.trailer.maxBytes + 10,
      }),
    );

    const response = await uploadPost(
      new Request("http://localhost/api/admin/uploads", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/exceeds max size of 20 MB/i);
    expect(supabase.uploads).toHaveLength(0);
  });
});
