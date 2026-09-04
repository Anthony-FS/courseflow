import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { POST } from "@/app/api/auth/register/route";

const valid = {
  fullName: "Somchai Jaidee",
  dob: "1998-05-12",
  education: "Bachelor of CS",
  email: "somchai@mail.com",
  password: "secret1",
  confirmPassword: "secret1",
};

function registerRequest(body, headers = {}) {
  const init = { method: "POST", headers: { ...headers } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request("http://localhost/api/auth/register", init);
}

function createAuthMock({
  session = null,
  error = null,
} = {}) {
  const signUp = vi.fn(async () => ({
    data: { session, user: { id: "user-1" } },
    error,
  }));
  const signOut = vi.fn(async () => ({ error: null }));
  return { auth: { signUp, signOut } };
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    createClient.mockResolvedValue(createAuthMock());
  });

  it("returns 429 without creating a user when the register limit is exceeded", async () => {
    checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 42 });

    const response = await POST(registerRequest(valid));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(body.error).toMatch(/too many registration attempts/i);
    expect(createClient).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      "auth-register:unknown",
      expect.objectContaining({ limit: 5, windowMs: 15 * 60_000 }),
    );
  });

  it("rate-limits by client IP", async () => {
    await POST(
      registerRequest(valid, { "x-forwarded-for": "203.0.113.10, 10.0.0.1" }),
    );

    expect(checkRateLimit).toHaveBeenCalledWith(
      "auth-register:203.0.113.10",
      expect.objectContaining({ limit: 5, windowMs: 15 * 60_000 }),
    );
  });

  it("returns 400 for invalid JSON without calling signUp", async () => {
    const supabase = createAuthMock();
    createClient.mockResolvedValue(supabase);

    const response = await POST(registerRequest("{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid json/i);
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("returns field errors when validation fails", async () => {
    const supabase = createAuthMock();
    createClient.mockResolvedValue(supabase);

    const response = await POST(
      registerRequest({ ...valid, email: "", password: "" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors.email).toBe("Please enter your email");
    expect(body.errors.password).toBe("Please enter a password");
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("signs up and returns ok", async () => {
    const supabase = createAuthMock();
    createClient.mockResolvedValue(supabase);

    const response = await POST(registerRequest(valid));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "somchai@mail.com",
      password: "secret1",
      options: {
        data: {
          full_name: "Somchai Jaidee",
          date_of_birth: "1998-05-12",
          educational_background: "Bachelor of CS",
        },
      },
    });
  });

  it("returns the Supabase error without creating a session", async () => {
    const supabase = createAuthMock({
      error: { message: "User already registered" },
    });
    createClient.mockResolvedValue(supabase);

    const response = await POST(registerRequest(valid));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("User already registered");
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
