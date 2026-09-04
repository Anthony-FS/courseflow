import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyAdminAssignmentStatus,
  updateAdminAssignmentStatus,
} from "@/lib/admin-assignments";
import { formatCourseDate } from "@/lib/format";

describe("admin assignment status client helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the status-only PATCH request", async () => {
    const result = {
      id: "assignment-1",
      is_active: false,
      updated_at: "2026-09-03T10:45:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateAdminAssignmentStatus("assignment-1", false)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/assignments/assignment-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      }),
    );
  });

  it("updates a row only with a successful API result", () => {
    const rows = [
      {
        id: "assignment-1",
        is_active: true,
        updatedDateLabel: "old date",
      },
    ];
    const updatedAt = "2026-09-03T10:45:00Z";
    const updated = applyAdminAssignmentStatus(rows, {
      id: "assignment-1",
      is_active: false,
      updated_at: updatedAt,
    });

    expect(updated[0]).toMatchObject({
      is_active: false,
      updatedDateLabel: formatCourseDate(updatedAt),
    });
    expect(rows[0]).toMatchObject({ is_active: true, updatedDateLabel: "old date" });
  });

  it("surfaces API errors without producing a false status result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "update failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(updateAdminAssignmentStatus("assignment-1", false)).rejects.toThrow(
      "update failed",
    );
  });
});
