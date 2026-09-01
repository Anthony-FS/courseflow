-- CourseFlow: indexes for public course catalog search, filtering, and sorting.
-- Apply in Supabase Dashboard → SQL Editor.

create extension if not exists pg_trgm;

-- The catalog searches with ILIKE '%query%' across both fields.
create index if not exists courses_title_trgm_idx
  on public.courses using gin (title gin_trgm_ops)
  where is_active = true;

create index if not exists courses_summary_trgm_idx
  on public.courses using gin (summary gin_trgm_ops)
  where is_active = true;

-- Keep the common active-catalog sorts narrow and index-only where possible.
create index if not exists courses_active_created_at_id_idx
  on public.courses (created_at desc, id asc)
  where is_active = true;

create index if not exists courses_active_updated_at_id_idx
  on public.courses (updated_at desc, id asc)
  where is_active = true;

create index if not exists courses_active_price_id_idx
  on public.courses (price asc, id asc)
  where is_active = true;

create index if not exists courses_active_title_id_idx
  on public.courses (title asc, id asc)
  where is_active = true;
