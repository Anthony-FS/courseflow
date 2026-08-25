import { describe, expect, it, vi, beforeEach } from "vitest";

import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import { createMockSupabase } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { POST as uploadFile } from "@/app/api/assignments/[id]/submission/file/route";

const USER = { id: "22222222-2222-2222-2222-222222222222" };
const ASSIGNMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COURSE_ID = "course-1";

const FILE_ASSIGNMENT = {
  id: ASSIGNMENT_ID,
  course_id: COURSE_ID,
  submission_type: "file",
  allowed_file_types: ["pdf"],
  max_file_size_mb: 10,
  answer_text: null,
  correct_choice: null,
};

function makeFile({
  name = "notes.pdf",
  type = "application/pdf",
  sizeBytes = 1024,
} = {}) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function postFile(file, id = ASSIGNMENT_ID) {
  const form = new FormData();
  if (file) form.set("file", file);
  return uploadFile(
    new Request(`http://localhost/api/assignments/${id}/submission/file`, {
      method: "POST",
      body: form,
    }),
    { params: Promise.resolve({ id }) },
  );
}

function mockUser(supabase) {
  requireUser.mockResolvedValue({
    supabase,
    user: USER,
    profile: { id: USER.id },
    error: null,
  });
}

describe("POST /api/assignments/[id]/submission/file", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a valid pdf and returns the storage path", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: FILE_ASSIGNMENT,
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await postFile(makeFile());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.path).toBe(`${USER.id}/${ASSIGNMENT_ID}/notes.pdf`);
    expect(body.name).toBe("notes.pdf");
    expect(supabase.uploads[0]).toMatchObject({
      bucket: "assignment-submissions",
      path: `${USER.id}/${ASSIGNMENT_ID}/notes.pdf`,
    });
  });

  it("rejects a missing file", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: FILE_ASSIGNMENT,
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await postFile(null);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe(EMPTY_FIELD_MESSAGE);
  });

  it("rejects upload on a text assignment", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: {
        ...FILE_ASSIGNMENT,
        submission_type: "text",
        allowed_file_types: null,
        max_file_size_mb: null,
      },
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await postFile(makeFile());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/does not accept file uploads/i);
  });

  it("rejects a png when only pdf is allowed", async () => {
    const supabase = createMockSupabase({
      assignmentsSelect: FILE_ASSIGNMENT,
      enrollmentsSelect: {
        id: "enr-1",
        user_id: USER.id,
        course_id: COURSE_ID,
      },
    });
    mockUser(supabase);

    const response = await postFile(
      makeFile({ name: "pic.png", type: "image/png" }),
    );
    expect(response.status).toBe(400);
  });
});
