import { describe, expect, it } from "vitest";

import { EMPTY_FIELD_MESSAGE } from "@/lib/course-validation";
import {
  INVALID_FILE_PATH_MESSAGE,
  INVALID_URL_MESSAGE,
  answerKeyFields,
  fileNameFromStoragePath,
  isOwnedSubmissionPath,
  sanitizeSubmissionFileName,
  validateStudentSubmissionContent,
  validateStudentUploadFile,
} from "@/lib/student-submission-validation";

const USER_ID = "22222222-2222-2222-2222-222222222222";
const ASSIGNMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function makeFile({
  name = "notes.pdf",
  type = "application/pdf",
  sizeBytes = 1024,
} = {}) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("validateStudentSubmissionContent", () => {
  it("rejects blank text", () => {
    const result = validateStudentSubmissionContent("text", "  ", {
      userId: USER_ID,
      assignmentId: ASSIGNMENT_ID,
    });
    expect(result).toEqual({ ok: false, message: EMPTY_FIELD_MESSAGE });
  });

  it("accepts trimmed text", () => {
    const result = validateStudentSubmissionContent("text", "  hello  ", {
      userId: USER_ID,
      assignmentId: ASSIGNMENT_ID,
    });
    expect(result).toEqual({ ok: true, content: "hello" });
  });

  it("rejects a non-http URL", () => {
    const result = validateStudentSubmissionContent(
      "url",
      "javascript:alert(1)",
      { userId: USER_ID, assignmentId: ASSIGNMENT_ID },
    );
    expect(result).toEqual({ ok: false, message: INVALID_URL_MESSAGE });
  });

  it("accepts an https URL", () => {
    const result = validateStudentSubmissionContent(
      "url",
      " https://example.com/work ",
      { userId: USER_ID, assignmentId: ASSIGNMENT_ID },
    );
    expect(result).toEqual({
      ok: true,
      content: "https://example.com/work",
    });
  });

  it("rejects a choice that is not A-D", () => {
    const result = validateStudentSubmissionContent("choice", "E", {
      userId: USER_ID,
      assignmentId: ASSIGNMENT_ID,
    });
    expect(result).toEqual({ ok: false, message: EMPTY_FIELD_MESSAGE });
  });

  it("accepts choice C", () => {
    const result = validateStudentSubmissionContent("choice", "C", {
      userId: USER_ID,
      assignmentId: ASSIGNMENT_ID,
    });
    expect(result).toEqual({ ok: true, content: "C" });
  });

  it("rejects a file path that is not this user's assignment folder", () => {
    const result = validateStudentSubmissionContent(
      "file",
      `${USER_ID}/other-assignment/notes.pdf`,
      { userId: USER_ID, assignmentId: ASSIGNMENT_ID },
    );
    expect(result).toEqual({
      ok: false,
      message: INVALID_FILE_PATH_MESSAGE,
    });
  });

  it("accepts a matching file path", () => {
    const path = `${USER_ID}/${ASSIGNMENT_ID}/notes.pdf`;
    const result = validateStudentSubmissionContent("file", path, {
      userId: USER_ID,
      assignmentId: ASSIGNMENT_ID,
    });
    expect(result).toEqual({ ok: true, content: path });
  });
});

describe("validateStudentUploadFile", () => {
  it("rejects a missing file", () => {
    const result = validateStudentUploadFile(null, ["pdf"], 10);
    expect(result.ok).toBe(false);
    expect(result.message).toBe(EMPTY_FIELD_MESSAGE);
  });

  it("rejects a pdf when only images are allowed", () => {
    const result = validateStudentUploadFile(
      makeFile(),
      ["image"],
      10,
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/unsupported file type/i);
  });

  it("rejects a file over the max size", () => {
    const result = validateStudentUploadFile(
      makeFile({ sizeBytes: 11 * 1024 * 1024 }),
      ["pdf"],
      10,
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/exceeds max size of 10 MB/i);
  });

  it("accepts a pdf under the limit", () => {
    const result = validateStudentUploadFile(makeFile(), ["pdf"], 10);
    expect(result.ok).toBe(true);
  });
});

describe("path helpers", () => {
  it("sanitizes path separators in file names", () => {
    expect(sanitizeSubmissionFileName("a/b\\c.pdf")).toBe("a_b_c.pdf");
  });

  it("reads the file name from a storage path", () => {
    expect(
      fileNameFromStoragePath(`${USER_ID}/${ASSIGNMENT_ID}/essay.pdf`),
    ).toBe("essay.pdf");
  });

  it("detects owned paths", () => {
    expect(
      isOwnedSubmissionPath(
        `${USER_ID}/${ASSIGNMENT_ID}/essay.pdf`,
        USER_ID,
        ASSIGNMENT_ID,
      ),
    ).toBe(true);
    expect(
      isOwnedSubmissionPath(
        `${USER_ID}/${ASSIGNMENT_ID}/../other.pdf`,
        USER_ID,
        ASSIGNMENT_ID,
      ),
    ).toBe(false);
  });
});

describe("answerKeyFields", () => {
  it("returns answerText for text when present", () => {
    expect(
      answerKeyFields("text", { answer_text: "People, process, product, partner" }),
    ).toEqual({ answerText: "People, process, product, partner" });
  });

  it("omits blank text keys", () => {
    expect(answerKeyFields("text", { answer_text: "  " })).toEqual({});
  });

  it("returns correctChoice for choice", () => {
    expect(
      answerKeyFields("choice", { correct_choice: "B" }),
    ).toEqual({ correctChoice: "B" });
  });

  it("returns nothing for file and url", () => {
    expect(answerKeyFields("file", { answer_text: "nope" })).toEqual({});
    expect(answerKeyFields("url", { correct_choice: "A" })).toEqual({});
  });
});
