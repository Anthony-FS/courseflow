import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMockSupabase, insertsFor, deletesFor } from "../helpers/mock-supabase.js";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { POST as createPromoCode } from "@/app/api/admin/promo-codes/route";
import { PATCH as updatePromoCode } from "@/app/api/admin/promo-codes/[id]/route";

const COURSE_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
];

function mockAdmin(supabase) {
  requireAdmin.mockResolvedValue({
    supabase,
    user: { id: "admin-id" },
    profile: { role: "admin", is_active: true },
    error: null,
  });
}

describe("admin promo code course relationships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates one promo row and links it to multiple courses", async () => {
    const supabase = createMockSupabase({ courseId: "promo-id" });
    mockAdmin(supabase);

    const response = await createPromoCode(new Request("http://localhost/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "MULTI25",
        minPurchaseAmount: "1000",
        discountType: "percent",
        discountValue: "25",
        courseIds: COURSE_IDS,
      }),
    }));

    expect(response.status).toBe(201);
    expect(insertsFor(supabase, "promo_codes")[0].rows).toHaveLength(1);
    expect(insertsFor(supabase, "promo_codes")[0].rows[0]).toMatchObject({
      code: "MULTI25",
      course_id: null,
    });
    expect(insertsFor(supabase, "promo_code_courses")[0].rows).toEqual([
      { promo_code_id: "promo-id", course_id: COURSE_IDS[0] },
      { promo_code_id: "promo-id", course_id: COURSE_IDS[1] },
    ]);
  });

  it("replaces course links when a promo code is edited", async () => {
    const supabase = createMockSupabase({ courseId: "promo-id" });
    mockAdmin(supabase);

    const response = await updatePromoCode(
      new Request("http://localhost/api/admin/promo-codes/promo-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "MULTI25",
          minPurchaseAmount: "1000",
          discountType: "percent",
          discountValue: "25",
          courseIds: [COURSE_IDS[1]],
        }),
      }),
      { params: Promise.resolve({ id: "promo-id" }) },
    );

    expect(response.status).toBe(200);
    expect(deletesFor(supabase, "promo_code_courses")[0].filters).toEqual([
      { column: "promo_code_id", value: "promo-id" },
    ]);
    expect(insertsFor(supabase, "promo_code_courses")[0].rows).toEqual([
      { promo_code_id: "promo-id", course_id: COURSE_IDS[1] },
    ]);
  });
});
