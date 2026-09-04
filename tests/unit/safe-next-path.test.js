import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-next-path";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/courses/abc")).toBe("/courses/abc");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});
