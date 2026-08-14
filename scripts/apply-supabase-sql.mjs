/**
 * Apply docs/sql/*.sql to the linked remote Supabase project via Management API.
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   NEXT_PUBLIC_SUPABASE_URL (from .env) — used to derive project ref
 *
 * Usage:
 *   node --env-file=.env scripts/apply-supabase-sql.mjs docs/sql/001_align_courses_with_add_form.sql
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sqlPath = resolve(
  process.argv[2] ?? "docs/sql/001_align_courses_with_add_form.sql",
);
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

if (!url) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const match = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
if (!match) {
  console.error("Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const projectRef = match[1];
const query = readFileSync(sqlPath, "utf8");

console.log(`Applying ${sqlPath} to project ${projectRef}...`);

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  },
);

const text = await response.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

if (!response.ok) {
  console.error("Apply failed:", response.status, body);
  process.exit(1);
}

console.log("Apply succeeded.");
console.log(body);
