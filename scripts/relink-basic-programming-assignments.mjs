/**
 * Relink Basic Programming assignments whose sub-lesson was cleared
 * when a lesson save deleted and recreated sub-lesson rows.
 *
 * Usage: node --env-file=.env.local scripts/relink-basic-programming-assignments.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COURSE_TITLE = "basic programming";

const EXTRA_TITLES = new Map([
  [
    "how do computers read and understand instructions given to them?",
    "how computers read instructions",
  ],
  [
    "which data type is typically used to store a true or false value?",
    "boolean values",
  ],
  [
    "what programming structure is used to execute a block of code only if a specific condition is true?",
    "if statements",
  ],
]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${text.slice(0, 400)}`);
  }
  return body;
}

const courses = await rest(
  `courses?select=id,title&title=ilike.${encodeURIComponent(COURSE_TITLE)}`,
);
const course = courses.find(
  (row) => String(row.title).trim().toLowerCase() === COURSE_TITLE,
);
if (!course) {
  console.error("Basic Programming course was not found");
  process.exit(1);
}

const [orphans, subLessons] = await Promise.all([
  rest(
    `assignments?select=id,title&course_id=eq.${course.id}&sub_lesson_id=is.null`,
  ),
  rest(
    `sub_lessons?select=id,title,lessons(title)&course_id=eq.${course.id}`,
  ),
]);

const subByTitle = new Map();
for (const sub of subLessons) {
  const key = String(sub.title ?? "").trim().toLowerCase();
  const list = subByTitle.get(key) ?? [];
  list.push(sub);
  subByTitle.set(key, list);
}

const seedSql = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../docs/sql/030_seed_basic_programming_assignments.sql",
  ),
  "utf8",
);
const seedTitles = new Map();
const rowPattern =
  /\$k\$([^$]+)\$k\$,\s*'(?:text|choice|file|url)',\s*\$t\$([^$]+)\$t\$/g;
for (const match of seedSql.matchAll(rowPattern)) {
  seedTitles.set(match[2].trim().toLowerCase(), match[1].trim().toLowerCase());
}

let linked = 0;
const unmatched = [];

for (const assignment of orphans) {
  const titleKey = String(assignment.title ?? "").trim().toLowerCase();
  const subTitle = EXTRA_TITLES.get(titleKey) ?? seedTitles.get(titleKey);
  const matches = subTitle ? subByTitle.get(subTitle) ?? [] : [];

  if (matches.length !== 1) {
    unmatched.push(assignment.title);
    continue;
  }

  const sub = matches[0];
  await rest(`assignments?id=eq.${assignment.id}&sub_lesson_id=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ sub_lesson_id: sub.id }),
  });
  linked += 1;
  console.log(`${assignment.title} -> ${sub.lessons?.title} / ${sub.title}`);
}

console.log(`Linked ${linked} of ${orphans.length}`);
if (unmatched.length > 0) {
  console.error("Unmatched:");
  for (const title of unmatched) console.error(`- ${title}`);
  process.exit(1);
}
