import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonError } from "@/lib/api";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/payments", () => ({ loadPayableCourse: vi.fn(), enrollPaidUser: vi.fn(), upsertPaymentRecord: vi.fn() }));
vi.mock("@/lib/omise-server", () => ({ createOmiseCharge: vi.fn(), fetchQrDataUrl: vi.fn(), getPromptPayQrUri: vi.fn(), isOmiseChargePaid: vi.fn() }));

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadPayableCourse } from "@/lib/payments";
import { createOmiseCharge } from "@/lib/omise-server";
import { resolvePromoTotal } from "@/lib/promo-lookup";
import { POST } from "@/app/api/promo-codes/validate/route";
import { POST as charge } from "@/app/api/payments/charge/route";

const COURSE = "11111111-1111-1111-1111-111111111111";
let rpc;
function request(body) {
  return new Request("http://localhost/api/promo-codes/validate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  rpc = vi.fn().mockResolvedValue({ data: {
    subtotal: 2000, promo: { code: "SAVE25", discount_type: "percent", discount_value: 25, min_purchase_amount: 0 },
  }, error: null });
  createClient.mockResolvedValue({ rpc });
  requireUser.mockResolvedValue({ supabase: {}, user: { id: "student" }, error: null });
  loadPayableCourse.mockResolvedValue({ id: COURSE, title: "Course", price: 2000 });
});

describe("promo validation API", () => {
  it("requires a session before looking up promo data", async () => {
    requireUser.mockResolvedValue({ error: jsonError("Unauthorized", 401) });
    expect((await POST(request({ code: "SAVE25", courseId: COURSE }))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignores a forged subtotal and calculates from the database price", async () => {
    const response = await POST(request({ code: "save25", courseId: COURSE, subtotal: 1 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ subtotal: 2000, discountAmount: 500, total: 1500 });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("lookup_checkout_promo", { p_code: "SAVE25", p_course_id: COURSE });
  });

  it.each([null, [], {}, { code: "A".repeat(65), courseId: COURSE }, { code: "SAVE25", courseId: "bad" }])(
    "rejects malformed requests %j without a lookup", async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it("returns Retry-After when the shared database quota is exhausted", async () => {
    rpc.mockResolvedValue({ data: { error: "Too many promo attempts.", status: 429, retryAfterSec: 37 }, error: null });
    const response = await POST(request({ code: "SAVE25", courseId: COURSE }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("37");
  });

  it("also stops checkout before creating a charge when promo quota is exhausted", async () => {
    rpc.mockResolvedValue({ data: { error: "Too many promo attempts.", status: 429, retryAfterSec: 23 }, error: null });
    const response = await charge(request({ courseId: COURSE, promoCode: "SAVE25", paymentMethod: "card", omiseToken: "test-token" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("23");
    expect(createOmiseCharge).not.toHaveBeenCalled();
  });

  it("fails closed when migration is missing, rather than trying a public SELECT", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "missing function details" } });
    const response = await POST(request({ code: "SAVE25", courseId: COURSE }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toContain("function details");
  });

  it("does not consume promo quota for checkout without a code", async () => {
    expect(await resolvePromoTotal({ code: "", courseId: COURSE, subtotal: 2000 })).toMatchObject({ total: 2000, error: null });
    expect(createClient).not.toHaveBeenCalled();
  });
});
