# CourseFlow

An online course learning platform built with Next.js and Supabase.

## Overview

CourseFlow is a course marketplace and learning application with two distinct
audiences:

**Learners** can:

- Browse a public course catalog with search, sorting, and pagination
- View course detail pages with a trailer, summary, and module samples
- Save courses to a wishlist
- Purchase a course by credit/debit card or PromptPay QR (via Omise), optionally
  applying a promo code
- Work through purchased courses in a dedicated learning view with a curriculum
  sidebar, lesson video, downloadable attachments, and per-sub-lesson progress
  tracking
- Submit assignment answers (free text, multiple choice, or file upload)
- Manage their profile, avatar, and password

**Admins** can:

- Create, edit, activate/deactivate, and delete courses, including cover image,
  video trailer, and attachment uploads
- Build a course curriculum of lessons and sub-lessons with a block-based content
  editor
- Create and manage assignments attached to sub-lessons
- Create and manage promo codes, including limiting a code to specific courses

Admin access is gated on a `profiles` row with `role = 'admin'` and
`is_active = true`.

## Tech stack

Versions are the ranges declared in `package.json`.

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.3.0 (App Router) |
| UI runtime | React 19.2.8 / React DOM 19.2.8 |
| Compiler | React Compiler (`reactCompiler: true`, `babel-plugin-react-compiler` 1.0.0) |
| Language | JavaScript (no TypeScript; `jsconfig.json` maps `@/*` → `./src/*`) |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss`, `tw-animate-css` |
| Components | shadcn (`radix-nova` style) on Radix UI, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Icons | `lucide-react` |
| Backend | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — Postgres, Auth, Storage |
| Payments | Omise (card + PromptPay QR), called over REST |
| Other UI | `embla-carousel-react`, `sonner` (toasts), `next-themes` |
| Testing | Vitest 4 with `@vitest/coverage-v8` |
| Linting | ESLint 9 with `eslint-config-next` |
| Commit tooling | Husky 9 + Commitlint (`@commitlint/config-conventional`) |

## Architecture

### Directory map

```
src/
├── app/                     App Router routes
│   ├── layout.js            Root layout — fonts, globals.css, Toaster
│   ├── globals.css          Tailwind 4 entry + design tokens
│   ├── (user)/              Learner-facing route group (wraps children in Navbar)
│   │   ├── page.js          Landing page
│   │   ├── (auth)/          login, register, forgot-password, reset-password
│   │   ├── courses/         Catalog, /courses/[code] detail, /courses/[code]/learn
│   │   ├── my-courses/      Enrolled courses with progress
│   │   ├── wishlist/        Saved courses
│   │   ├── payment/         Checkout (card + PromptPay QR)
│   │   ├── profile/         Profile and change-password
│   │   └── assignments/     Placeholder page (no content yet)
│   ├── admin/               Admin console (courses, lessons, assignments,
│   │                        promo codes, admin login); /admin redirects to
│   │                        /admin/courses
│   ├── api/                 Route handlers (see below)
│   └── auth/confirm/        Supabase email-link handler (PKCE code and
│                            token_hash/verifyOtp), used by password reset
├── components/
│   ├── ui/                  shadcn primitives (button, dialog, input, ...)
│   ├── admin/               Admin tables, forms, filters, block builder
│   ├── auth/                Login, register, password forms
│   ├── course-detail/       Purchase card, trailer, wishlist/subscribe buttons
│   ├── course-learn/        Curriculum sidebar, lesson content, video, assignments
│   ├── courses/             Catalog listing
│   ├── landing/             Marketing sections
│   ├── my-courses/, wishlist/, payment/, profile/
│   └── navbar.jsx, footer.jsx, user-menu.jsx, mobile-nav-menu.jsx
├── lib/
│   ├── supabase/
│   │   ├── client.js        Browser client (`createBrowserClient`)
│   │   ├── server.js        Cookie-bound server client + `createServiceClient()`
│   │   └── proxy.js         Session refresh + admin route guard
│   ├── auth.js              `getSessionUser`, `requireUser`, `requireAdmin`
│   ├── api.js               `jsonOk` / `jsonError` / `jsonTooManyRequests`
│   ├── courses.js, public-course-catalog.js, course-validation.js
│   ├── course-learn*.js     Learning view: progress, video, scroll, content
│   ├── enrollments.js, wishlist.js, payments.js, promo-*.js
│   ├── omise-client.js      Browser tokenisation (card token, PromptPay source)
│   ├── omise-server.js      Server-side Omise REST calls (secret key)
│   ├── admin-*.js, assignments.js, student-*.js
│   └── rate-limit.js, pagination.js, sorting.js, format.js, utils.js
├── hooks/                   (empty)
└── proxy.js                 Next.js proxy entry point + route matcher
docs/
├── erd.md                   Database ERD (Mermaid)
└── sql/                     Ordered schema, RLS, storage, and seed migrations
scripts/
└── apply-supabase-sql.mjs   Applies one docs/sql file via the Supabase
                             Management API
tests/
├── unit/                    Pure-function tests for lib modules
├── integration/             Route-handler tests against a mocked Supabase
└── helpers/mock-supabase.js
```

### Routing

Routing is the Next.js App Router. `src/app/(user)` and `src/app/(user)/(auth)`
are route groups — they organise files without adding URL segments, so
`(user)/courses/page.js` serves `/courses`. The `(user)` layout wraps its
children in the shared `Navbar`; `admin/layout.js` provides the admin shell and
sidebar.

Pages are React Server Components that query Supabase directly; interactive
pieces are client components under `src/components`.

### API routes

Route handlers live under `src/app/api`:

- **Public / learner** — `courses` (catalog), `enrollments`, `wishlist`,
  `progress`, `profile`, `profile/avatar`, `assignments/[id]/submission`,
  `assignments/[id]/submission/file`, `promo-codes/validate`
- **Payments** — `payments/charge` (create an Omise charge),
  `payments/charges/[id]` (poll charge status), `payments/webhook` (Omise event
  callback)
- **Admin** — `admin/courses`, `admin/courses/[id]`,
  `admin/courses/[id]/lessons`, `admin/courses/[id]/lessons/[lessonId]`,
  `admin/assignments`, `admin/assignments/[id]`, `admin/promo-codes`,
  `admin/promo-codes/[id]`, `admin/uploads`

### Data access

There are three Supabase clients, chosen by context:

1. **Browser client** (`lib/supabase/client.js`) — the publishable/anon key, used
   from client components. Subject to RLS.
2. **Server client** (`lib/supabase/server.js` → `createClient()`) — reads and
   writes auth cookies through `next/headers`, so queries run as the signed-in
   user and RLS applies. This is the default for server components and route
   handlers.
3. **Service-role client** (`createServiceClient()`) — bypasses RLS. Returns
   `null` when `SUPABASE_SERVICE_ROLE_KEY` is unset. Used for the cached public
   catalog and payment fulfilment. Promo lookups use the signed-in session with
   a database RPC that enforces a shared per-account rate limit.

Query and mapping logic is kept in `src/lib` rather than in components, so the
same helpers back both server components and route handlers.

The public catalog is cached with `unstable_cache` under the `courses` tag
(`lib/public-course-catalog.js`, 60-second revalidate); admin course mutations
call `revalidateTag("courses")` to invalidate it.

### Auth and session handling

`src/proxy.js` runs on every request except static assets and
`/api/admin/uploads` (see its `config.matcher`). It delegates to
`updateSession()` in `lib/supabase/proxy.js`, which:

- refreshes the Supabase session and writes the rotated auth cookies onto the
  response;
- for `/admin/*` **page** routes, looks up the user's `profiles` row and
  redirects non-admins away — unauthenticated users to
  `/admin/login?next=<path>`, authenticated non-admins to `/`; an admin already
  on `/admin/login` is redirected onward.

Admin API routes are deliberately *not* guarded there. They enforce access in
the handler via `requireAdmin()` from `lib/auth.js`, which pairs with
`requireUser()` for learner-only endpoints. Both return a ready-to-return
`Response` in their `error` field, so handlers start with:

```js
const { supabase, user, error } = await requireAdmin();
if (error) return error;
```

Email links for password recovery land on `src/app/auth/confirm/route.js`, which
handles both PKCE `code` exchange and `token_hash` + `type` verification before
redirecting to a validated relative path.

## Local setup

The repo has a `package-lock.json` and no other lockfile, so **npm** is the
package manager.

```bash
git clone <repository-url>
cd courseflow
npm install
```

`npm install` runs the `prepare` script, which installs the Husky git hooks.

Create a `.env` file from the template and fill in the values (see
[Environment variables](#environment-variables)):

```bash
cp .env.example .env
```

Then start the dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000. You will need a configured Supabase
project before most pages work — see the next section.

## Supabase setup

### 1. Create the project and collect keys

1. Create a project at https://supabase.com/dashboard.
2. In **Project Settings → API**, copy the project URL into
   `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key into
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`. Per
   `.env.example`, this is required for QR payment enrollment (polling and
   webhook) and some admin local testing.

### 2. Apply the SQL migrations

> **The files in `docs/sql/` are order-dependent and must be run in filename
> order.** Later files assume objects created by earlier ones — for example,
> `012_courses_promo_admin_mutation_policies.sql` requires `private.is_admin()`
> from `007_admin_course_media_rls.sql`, `015_promo_codes_validate_select.sql`
> must follow `014_promo_code_courses.sql`, and `016_payments.sql` must follow
> `011_enrollments.sql`.

Run each file in the Supabase Dashboard **SQL Editor**, or one at a time with the
included script:

```bash
node --env-file=.env scripts/apply-supabase-sql.mjs docs/sql/001_align_courses_with_add_form.sql
```

That script uses the Supabase Management API and additionally needs
`SUPABASE_ACCESS_TOKEN` in the environment (create one at
https://supabase.com/dashboard/account/tokens). It derives the project ref from
`NEXT_PUBLIC_SUPABASE_URL`. It is not listed in `.env.example`; export it in your
shell or add it to `.env` when using the script.

Files in order:

| File | Creates / changes |
| --- | --- |
| `001_align_courses_with_add_form.sql` | Aligns the `courses` schema with the Add Course form (summary, learning time, separate cover image and trailer); course media storage policies |
| `002_seed_admin_promo_codes.sql` | Seeds demo promo codes for the admin list |
| `003_assignment_submission_columns.sql` | Assignment submission settings used by the Add Assignment form |
| `004_lessons_select_policy.sql` | Lets authenticated admins read `lessons` (needed by the admin assignment list) |
| `005_course_media_buckets.sql` | Storage buckets for cover image, video trailer, and attachments, plus their policies |
| `005_courses_updated_at.sql` | Tracks last update time on `courses` |
| `005_lessons_admin_mutation_policies.sql` | Admin insert/update/delete policies for `lessons`, `sub_lessons`, `materials` |
| `006_lessons_on_delete_cascade.sql` | Recreates foreign keys with `ON DELETE CASCADE` so deleting a course removes its lessons |
| `007_admin_course_media_rls.sql` | `private.is_admin()` (SECURITY DEFINER) and storage RLS letting admins upload media with the anon key |
| `008_course_catalog_select.sql` | Lets signed-in learners read `lessons` and `sub_lessons` (module samples) |
| `010_wishlists.sql` | `wishlists` table and owner-scoped RLS |
| `011_enrollments.sql` | `enrollments` table, owner-scoped RLS, and enrolled-learner access to `materials` |
| `012_courses_promo_admin_mutation_policies.sql` | Public catalog read plus admin mutation policies on `courses` and `promo_codes` |
| `013_courses_course_code_unique.sql` | `course_code` column with case-insensitive uniqueness |
| `014_promo_code_courses.sql` | `promo_code_courses` join table so one code can cover several courses |
| `015_promo_codes_updated_at.sql` | Tracks last update time on `promo_codes` |
| `015_promo_codes_validate_select.sql` | Lets checkout look up active promo codes without the service role |
| `016_payments.sql` | `payments` table for Omise card / PromptPay orders, with RLS |
| `017_assignment_answer_columns.sql` | Assignment answer key for text and 4-choice submission types |
| `017_sub_lesson_progress.sql` | `sub_lesson_progress` (visit / complete / assignment submit) with RLS; safe to re-run |
| `018_student_submissions.sql` | `submissions` table and the private `assignment-submissions` storage bucket |
| `019_profile_avatars.sql` | Avatar storage: public read, users may mutate only their own user-id folder |
| `020_course_tags.sql` | `course_tags` lookup table and `courses.tag_id` |
| `020_courses_is_active.sql` | `courses.is_active` — hides a course from new purchases while enrolled learners keep access |
| `021_catalog_indexes.sql` | Indexes for catalog search, filtering, and sorting |
| `021_seed_business_marketing_courses.sql` | Seeds 4 Marketing + 4 Business demo courses (requires `020_course_tags.sql`) |
| `022_enrollment_progress_indexes.sql` | Indexes for batch-loading learner progress on My Courses |
| `022_seed_basic_programming_sub_lesson_content.sql` | Expands Basic Programming sub-lesson copy |
| `023_basic_programming_remove_videos.sql` | Keeps video only on Basic Programming's intro sub-lesson |
| `025_promo_code_security.sql` | Restricts promo listing, rate-limits validation, and saves admin promo edits atomically |

For the coordinated promo code application/database rollout and verification,
see [Promo code security rollout](docs/promo-code-security.md).

Notes on specific files:

- Seed files (`002`, `021_seed_...`, `022_seed_...`, `023_...`) must be run in an
  admin/service-role context, per their own comments.
- Row Level Security is enabled and policies are created by these files — there
  is no separate manual RLS step.
- Storage buckets are created by the SQL itself: `course-covers`,
  `course-trailers`, and `course-attachments` (`005_course_media_buckets.sql`),
  `assignment-submissions` (`018_student_submissions.sql`), and
  `profile-avatars` (`019_profile_avatars.sql`).

### 3. Configure auth redirect URLs

`.env.example` documents this step. In the Supabase Dashboard under
**Authentication → URL Configuration**, add these redirect URLs (and their
equivalents on your production domain):

```
http://localhost:3000/auth/confirm
http://localhost:3000/reset-password
```

Optionally, under **Authentication → Email Templates → Reset Password**, use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset Password</a>
```

`.env.example` notes this is more reliable across devices.

### 4. Configure Omise

Get test keys from https://dashboard.omise.co for
`NEXT_PUBLIC_OMISE_PUBLIC_KEY` and `OMISE_SECRET_KEY`. For PromptPay QR testing
against localhost, `docs/sql/016_payments.sql` suggests tunnelling with
`ngrok http 3000` and pointing the Omise Dashboard webhook at that URL —
`POST /api/payments/webhook`.

### 5. Create an admin user

Admin routes require a `profiles` row with `role = 'admin'` and
`is_active = true` (see `lib/supabase/proxy.js` and `lib/auth.js`). Register a
user through the app, then set those columns on their profile row.

## Environment variables

Every variable below comes from `.env.example`.

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; also used to build public storage URLs and to derive the project ref in `scripts/apply-supabase-sql.mjs` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key for the browser and cookie-bound server clients (RLS applies) | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key that bypasses RLS. Required for QR payment enrollment (poll + webhook) and some admin local testing | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_OMISE_PUBLIC_KEY` | Omise public key used in the browser to tokenise cards and create PromptPay sources | https://dashboard.omise.co (test keys) |
| `OMISE_SECRET_KEY` | Omise secret key for server-side charge, event, and QR-image requests | https://dashboard.omise.co (test keys) |

Never commit real secrets. `.gitignore` excludes `.env*` except `.env.example`.

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `next dev` | Start the development server on port 3000 |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the production build |
| `lint` | `eslint` | Lint with `eslint-config-next` core-web-vitals rules |
| `test` | `vitest run` | Run the unit and integration suites once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `prepare` | `husky` | Install git hooks (runs automatically on `npm install`) |

Coverage is available through `@vitest/coverage-v8`.

## Contributing

### Commit conventions

This repo follows the [Conventional Commits](https://www.conventionalcommits.org)
specification. Commit messages are checked automatically by **Husky** +
**Commitlint** (`@commitlint/config-conventional`) through the `commit-msg`
hook — invalid messages are rejected.

Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Common types:

| Type | When to use |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting (no logic change) |
| `refactor` | Code change that is not a fix or feature |
| `chore` | Build / tooling / maintenance |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |

Examples, matching messages in the history:

```
feat(learn): enhance lesson navigation and progress tracking
fix(wishlist): hide quick add button for enrolled courses
refactor(course-learn): enhance lesson content and assignment handling
docs(readme): document commit message rules
```

The hooks are installed by the `prepare` script, so a plain `npm install` is all
the setup required per clone.

### Workflow

Recent history shows work done on feature branches (for example
`feat/progress-sidebar`, `fix/optimize-rendering-and-supabase-calls`) merged into
`dev` via pull requests.

## Deployment

The repository contains no deployment configuration — there is no
`vercel.json`, no CI workflow, and no Dockerfile — so deployment settings are
managed outside the repo.

For a Vercel deployment, import the repository and configure:

- **Build command** — `npm run build` (Vercel's Next.js default)
- **Environment variables** — every variable in the
  [Environment variables](#environment-variables) table, set for the
  environments you deploy

Before going live, also:

- Add your production URLs to Supabase **Authentication → URL Configuration**
  (`https://<your-domain>/auth/confirm` and `https://<your-domain>/reset-password`)
- Point the Omise webhook at `https://<your-domain>/api/payments/webhook`

One caveat worth knowing: the rate limiter in `src/lib/rate-limit.js` keeps its
state in process memory. Its own comment notes this works for a single
`next start` process and does not share state across serverless replicas.
