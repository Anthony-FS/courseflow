import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonError } from "@/lib/api";

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
import { requireAdmin } from "@/lib/auth";
import { POST } from "@/app/api/admin/promo-codes/route";
import { PATCH } from "@/app/api/admin/promo-codes/[id]/route";

const COURSE = "11111111-1111-1111-1111-111111111111";
const PROMO = "22222222-2222-2222-2222-222222222222";
const valid = { code: "save25", discountType: "percent", discountValue: 25, minPurchaseAmount: 0, courseIds: [COURSE] };
let supabase;
function request(body, method = "POST") {
  return new Request("http://localhost/api/admin/promo-codes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  supabase = { rpc: vi.fn().mockResolvedValue({ data: PROMO, error: null }) };
  requireAdmin.mockResolvedValue({ supabase, user: { id: "admin" }, error: null });
});

describe("admin promo API", () => {
  it("creates promo and deduplicated links in one database call", async () => {
    const response = await POST(request({ ...valid, courseIds: [COURSE, COURSE] }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: PROMO });
    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith("save_admin_promo", {
      p_id: null, p_code: "SAVE25", p_discount_type: "percent", p_discount_value: 25,
      p_min_purchase_amount: 0, p_course_ids: [COURSE],
    });
  });

  it("updates through the same transaction and supports explicit all-course scope", async () => {
    const response = await PATCH(request({ ...valid, courseIds: [] }, "PATCH"), { params: Promise.resolve({ id: PROMO }) });
    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith("save_admin_promo", expect.objectContaining({ p_id: PROMO, p_course_ids: [] }));
  });

  it("denies students before accessing the database", async () => {
    requireAdmin.mockResolvedValue({ error: jsonError("Forbidden", 403) });
    expect((await POST(request(valid))).status).toBe(403);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it.each([null, [], { ...valid, courseIds: ["bad-id"] }, { ...valid, courseIds: "all" }, { ...valid, code: "A".repeat(65) }, { ...valid, discountValue: 101 }])(
    "rejects malformed admin input %j without saving", async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(supabase.rpc).not.toHaveBeenCalled();
    },
  );

  it.each([["23505", 409], ["23503", 400], ["P0002", 404], ["PGRST202", 503]])(
    "maps database error %s to %i without leaking internal details", async (code, status) => {
      supabase.rpc.mockResolvedValue({ data: null, error: { code, message: "private database detail" } });
      const response = await POST(request(valid));
      expect(response.status).toBe(status);
      expect((await response.json()).error).not.toContain("private database detail");
    },
  );
});
