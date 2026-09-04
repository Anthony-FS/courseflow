import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Real PostgreSQL in memory: no network, credentials or production data.
const ADMIN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STUDENT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OTHER = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const COURSE = "11111111-1111-1111-1111-111111111111";
const COURSE2 = "22222222-2222-2222-2222-222222222222";
const MISSING = "33333333-3333-3333-3333-333333333333";
const PROMO = "44444444-4444-4444-4444-444444444444";
let db;

async function asUser(id, role = "authenticated") {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
}

async function lookup(code = "SAVE25", course = COURSE) {
  const { rows } = await db.query("select public.lookup_checkout_promo($1, $2) as result", [code, course]);
  return rows[0].result;
}

async function save(id, courses = [COURSE2], code = "EDITED") {
  return db.query("select public.save_admin_promo($1, $2, 'percent', 20, 0, $3::uuid[]) as id", [id, code, courses]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema private;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.profiles (id uuid primary key, role text, is_active boolean);
    create table public.courses (id uuid primary key, price numeric, is_active boolean default true);
    create table public.promo_codes (
      id uuid primary key default gen_random_uuid(), code text unique not null,
      discount_type text, discount_value numeric, min_purchase_amount numeric,
      course_id uuid references public.courses, starts_at timestamptz,
      ends_at timestamptz, is_active boolean default true, updated_at timestamptz
    );
    create table public.promo_code_courses (
      promo_code_id uuid references public.promo_codes on delete cascade,
      course_id uuid references public.courses, primary key (promo_code_id, course_id)
    );
    create function private.is_admin() returns boolean language sql stable security definer
    set search_path = '' as $$
      select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active)
    $$;
    grant usage on schema auth, private to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    alter table public.promo_codes enable row level security;
    alter table public.promo_code_courses enable row level security;
    create policy legacy_read on public.promo_codes for select using (true);
    create policy legacy_links_read on public.promo_code_courses for select using (true);
    insert into auth.users values ('${ADMIN}'), ('${STUDENT}'), ('${OTHER}');
    insert into public.profiles values ('${ADMIN}', 'admin', true), ('${STUDENT}', 'student', true), ('${OTHER}', 'student', true);
    insert into public.courses values ('${COURSE}', 2000, true), ('${COURSE2}', 1500, true);
  `);
  const migration = readFileSync("docs/sql/025_promo_code_security.sql", "utf8");
  await db.exec(migration);
  await db.exec(migration); // Must also be safe to reapply.
}, 30_000);

beforeEach(async () => {
  await db.exec(`reset role;
    truncate private.promo_validation_limits;
    delete from public.promo_codes;
    update public.courses set is_active = true;
    update public.profiles set is_active = true;
    insert into public.promo_codes
      (id, code, discount_type, discount_value, min_purchase_amount, course_id)
      values ('${PROMO}', 'SAVE25', 'percent', 25, 0, '${COURSE}');
    insert into public.promo_code_courses values ('${PROMO}', '${COURSE}');
  `);
  await asUser(STUDENT);
});

afterAll(async () => { await db?.close(); });

describe("promo database security", () => {
  it("blocks anonymous listing and RPC execution", async () => {
    await asUser(null, "anon");
    await expect(db.query("select code from public.promo_codes")).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("select * from public.promo_code_courses")).rejects.toMatchObject({ code: "42501" });
    await expect(lookup()).rejects.toMatchObject({ code: "42501" });
    await expect(save(null)).rejects.toMatchObject({ code: "42501" });
  });

  it("hides both tables from students despite legacy permissive policies", async () => {
    expect((await db.query("select code from public.promo_codes")).rows).toEqual([]);
    expect((await db.query("select * from public.promo_code_courses")).rows).toEqual([]);
    await asUser(ADMIN);
    expect((await db.query("select code from public.promo_codes")).rows).toEqual([{ code: "SAVE25" }]);
  });

  it("returns only matching promo fields and the database price", async () => {
    expect(await lookup(" save25 ")).toEqual({
      subtotal: 2000,
      promo: { code: "SAVE25", discount_type: "percent", discount_value: 25, min_purchase_amount: 0 },
    });
  });

  it("keeps legacy single-course restrictions when no link rows exist", async () => {
    await db.exec("reset role; delete from public.promo_code_courses;");
    await asUser(STUDENT);
    expect((await lookup()).promo.code).toBe("SAVE25");
    expect((await lookup("SAVE25", COURSE2)).status).toBe(400);
  });

  it("counts successful and unsuccessful attempts together", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await lookup()).promo.code).toBe("SAVE25");
      expect((await lookup(`GUESS${i}`, COURSE2)).status).toBe(400);
    }
    const blocked = await lookup();
    expect(blocked.status).toBe(429);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
    await asUser(OTHER);
    expect((await lookup()).promo.code).toBe("SAVE25");
  });

  it("does not expose expiry or wrong-course details when guessing", async () => {
    const missing = await lookup("MISSING");
    expect(await lookup("SAVE25", COURSE2)).toEqual(missing);
    await db.exec(`reset role; update public.promo_codes set ends_at = now() - interval '1 day';`);
    await asUser(STUDENT);
    expect(await lookup()).toEqual(missing);
  });

  it("rejects inactive courses, future codes and unmet minimums", async () => {
    await db.exec(`reset role; update public.courses set is_active = false where id = '${COURSE}';`);
    await asUser(STUDENT);
    expect((await lookup()).status).toBe(400);
    await db.exec(`reset role; update public.courses set is_active = true;
      update public.promo_codes set starts_at = now() + interval '1 day';`);
    await asUser(STUDENT);
    expect((await lookup()).status).toBe(400);
    await db.exec(`reset role; update public.promo_codes set starts_at = null, min_purchase_amount = 9999;`);
    await asUser(STUDENT);
    expect((await lookup()).status).toBe(400);
  });

  it("resets an expired window and prevents users resetting it themselves", async () => {
    for (let i = 0; i < 11; i++) await lookup("MISSING");
    expect((await lookup()).status).toBe(429);
    await expect(db.query("delete from private.promo_validation_limits")).rejects.toMatchObject({ code: "42501" });
    await db.exec(`reset role; update private.promo_validation_limits set window_started_at = now() - interval '61 seconds';`);
    await asUser(STUDENT);
    expect((await lookup()).promo.code).toBe("SAVE25");
  });

  it("rejects unauthenticated callers even with function execute privileges", async () => {
    await asUser(null);
    expect((await lookup()).status).toBe(401);
  });

  it("rejects student and deactivated-admin save RPC calls", async () => {
    await expect(save(PROMO)).rejects.toMatchObject({ code: "42501" });
    await db.exec(`reset role; update public.profiles set is_active = false where id = '${ADMIN}';`);
    await asUser(ADMIN);
    await expect(save(PROMO)).rejects.toMatchObject({ code: "42501" });
  });

  it("rolls back both the promo and course links when an update fails", async () => {
    await asUser(ADMIN);
    await expect(save(PROMO, [MISSING])).rejects.toMatchObject({ code: "23503" });
    expect((await db.query("select code, course_id from public.promo_codes")).rows).toEqual([{ code: "SAVE25", course_id: COURSE }]);
    expect((await db.query("select course_id from public.promo_code_courses")).rows).toEqual([{ course_id: COURSE }]);
  });

  it("does not leave a global promo behind when creation fails", async () => {
    await asUser(ADMIN);
    await expect(save(null, [MISSING], "BROKEN")).rejects.toMatchObject({ code: "23503" });
    expect((await db.query("select code from public.promo_codes where code = 'BROKEN'")).rows).toEqual([]);
  });

  it("atomically changes scope, deduplicates links and supports explicit all-course scope", async () => {
    await asUser(ADMIN);
    await save(PROMO, [COURSE2, COURSE2]);
    await asUser(STUDENT);
    expect((await lookup("EDITED", COURSE)).status).toBe(400);
    expect((await lookup("EDITED", COURSE2)).subtotal).toBe(1500);
    await asUser(ADMIN);
    await save(PROMO, []);
    await asUser(STUDENT);
    expect((await lookup("EDITED", COURSE)).subtotal).toBe(2000);
  });

  it("preserves inactive status and rejects missing promos or invalid direct input", async () => {
    await db.exec(`reset role; update public.promo_codes set is_active = false;`);
    await asUser(ADMIN);
    await save(PROMO);
    expect((await db.query("select is_active from public.promo_codes")).rows[0].is_active).toBe(false);
    await expect(save(MISSING)).rejects.toMatchObject({ code: "P0002" });
    await expect(save(PROMO, [], "BAD-CODE")).rejects.toMatchObject({ code: "22023" });
    await expect(db.query("select public.save_admin_promo(null, 'BAD', 'percent', 101, 0, '{}')")).rejects.toMatchObject({ code: "22023" });
  });
});
