-- Apply after 024. Deploy together with the promo RPC callers.
-- Only promo tables/functions are changed; no payment/enrollment policies.
begin;

-- Remove public listing. The restrictive guard also protects against older
-- permissive SELECT policies that may still exist on a deployed database.
drop policy if exists "promo_codes_select_active" on public.promo_codes;
drop policy if exists "promo_code_courses_select_public" on public.promo_code_courses;
revoke select on public.promo_codes, public.promo_code_courses from anon;

alter table public.promo_codes enable row level security;
alter table public.promo_code_courses enable row level security;
drop policy if exists "promo_codes_no_anonymous_read" on public.promo_codes;
create policy "promo_codes_no_anonymous_read" on public.promo_codes
  as restrictive for select to anon using (false);
drop policy if exists "promo_code_courses_no_anonymous_read" on public.promo_code_courses;
create policy "promo_code_courses_no_anonymous_read" on public.promo_code_courses
  as restrictive for select to anon using (false);
drop policy if exists "promo_codes_read_admin_only" on public.promo_codes;
create policy "promo_codes_read_admin_only" on public.promo_codes
  as restrictive for select to authenticated
  using ((select private.is_admin()));
drop policy if exists "promo_code_courses_read_admin_only" on public.promo_code_courses;
create policy "promo_code_courses_read_admin_only" on public.promo_code_courses
  as restrictive for select to authenticated
  using ((select private.is_admin()));

-- One bounded counter per account, shared by Apply, checkout and direct RPCs.
-- Callers cannot choose a user ID, reset the counter or read other counters.
create table if not exists private.promo_validation_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts between 1 and 11)
);
alter table private.promo_validation_limits enable row level security;
revoke all on private.promo_validation_limits from public, anon, authenticated;

create or replace function public.lookup_checkout_promo(p_code text, p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_started_at timestamptz;
  v_attempts integer;
  v_code text := upper(btrim(p_code));
  v_promo public.promo_codes%rowtype;
  v_price numeric;
  v_invalid jsonb := jsonb_build_object(
    'error', 'This promo code is invalid or unavailable for this course.', 'status', 400
  );
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Unauthorized', 'status', 401);
  end if;

  insert into private.promo_validation_limits as limits
    (user_id, window_started_at, attempts)
  values (v_user_id, v_now, 1)
  on conflict (user_id) do update set
    attempts = case
      when limits.window_started_at <= v_now - interval '60 seconds' then 1
      else least(limits.attempts + 1, 11)
    end,
    window_started_at = case
      when limits.window_started_at <= v_now - interval '60 seconds' then v_now
      else limits.window_started_at
    end
  returning window_started_at, attempts into v_started_at, v_attempts;

  if v_attempts > 10 then
    return jsonb_build_object(
      'error', 'Too many promo attempts. Please wait before trying again.',
      'status', 429,
      'retryAfterSec', greatest(1, ceil(extract(epoch from
        (v_started_at + interval '60 seconds' - v_now)))::integer)
    );
  end if;

  -- Return failures instead of raising: guessed/expired codes must still
  -- commit their rate-limit attempt. No raw table rows or counts are exposed.
  if v_code is null or v_code !~ '^[A-Z0-9]{1,64}$' or p_course_id is null then
    return v_invalid;
  end if;

  select c.price into v_price from public.courses c
  where c.id = p_course_id and c.is_active = true;
  if not found or v_price is null or v_price < 0
    or v_price::text in ('NaN', 'Infinity', '-Infinity') then
    return v_invalid;
  end if;

  select p.* into v_promo from public.promo_codes p
  where p.code = v_code and p.is_active = true
    and (p.starts_at is null or p.starts_at <= v_now)
    and (p.ends_at is null or p.ends_at >= v_now)
  for share; -- Keep discount fields and scope consistent during an admin edit.
  if not found then return v_invalid; end if;

  if exists (select 1 from public.promo_code_courses pc where pc.promo_code_id = v_promo.id) then
    if not exists (
      select 1 from public.promo_code_courses pc
      where pc.promo_code_id = v_promo.id and pc.course_id = p_course_id
    ) then return v_invalid; end if;
  elsif v_promo.course_id is not null and v_promo.course_id <> p_course_id then
    return v_invalid;
  end if;

  if v_price < coalesce(v_promo.min_purchase_amount, 0) then return v_invalid; end if;

  return jsonb_build_object(
    'subtotal', v_price,
    'promo', jsonb_build_object(
      'code', v_promo.code,
      'discount_type', v_promo.discount_type,
      'discount_value', v_promo.discount_value,
      'min_purchase_amount', coalesce(v_promo.min_purchase_amount, 0)
    )
  );
end;
$$;

revoke all on function public.lookup_checkout_promo(text, uuid) from public, anon;
grant execute on function public.lookup_checkout_promo(text, uuid) to authenticated;

-- A failed INSERT of links rolls back the entire statement, including UPDATE
-- and DELETE. Updates lock the promo row to serialize concurrent editors.
create or replace function public.save_admin_promo(
  p_id uuid,
  p_code text,
  p_discount_type text,
  p_discount_value numeric,
  p_min_purchase_amount numeric,
  p_course_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text := upper(btrim(p_code));
begin
  if not private.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if v_code is null or v_code !~ '^[A-Z0-9]{1,64}$'
    or p_discount_type is null or p_discount_type not in ('fixed', 'percent')
    or p_discount_value is null or p_discount_value < 0
    or p_discount_value::text in ('NaN', 'Infinity', '-Infinity')
    or p_min_purchase_amount is null or p_min_purchase_amount < 0
    or p_min_purchase_amount::text in ('NaN', 'Infinity', '-Infinity')
    or p_min_purchase_amount <> trunc(p_min_purchase_amount)
    or (p_discount_type = 'percent' and p_discount_value > 100)
    or (p_discount_type = 'fixed' and p_min_purchase_amount < ceil(p_discount_value + 100))
    or p_course_ids is null or array_position(p_course_ids, null) is not null then
    raise exception 'Invalid promo input' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.promo_codes
      (code, discount_type, discount_value, min_purchase_amount, course_id, starts_at, is_active)
    values
      (v_code, p_discount_type, p_discount_value, p_min_purchase_amount, null, now(), true)
    returning id into v_id;
  else
    update public.promo_codes set
      code = v_code,
      discount_type = p_discount_type,
      discount_value = p_discount_value,
      min_purchase_amount = p_min_purchase_amount,
      course_id = null,
      updated_at = now()
    where id = p_id
    returning id into v_id;
    if not found then
      raise exception 'Promo code not found' using errcode = 'P0002';
    end if;
    delete from public.promo_code_courses where promo_code_id = v_id;
  end if;

  insert into public.promo_code_courses (promo_code_id, course_id)
  select v_id, selected.course_id
  from (select distinct unnest(p_course_ids) as course_id) selected;

  return v_id;
end;
$$;

revoke all on function public.save_admin_promo(uuid, text, text, numeric, numeric, uuid[]) from public, anon;
grant execute on function public.save_admin_promo(uuid, text, text, numeric, numeric, uuid[]) to authenticated;

commit;
