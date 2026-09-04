-- CourseFlow: payment orders for Omise card / PromptPay QR.
-- Apply in Supabase Dashboard → SQL Editor after 011_enrollments.sql.
-- Webhook: POST /api/payments/webhook
-- Local QR testing: ngrok http 3000 → set that URL in Omise Dashboard.

begin;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  omise_charge_id text not null,
  amount numeric not null,
  currency text not null default 'thb',
  method text not null check (method in ('card', 'qr')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  promo_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_omise_charge_id_uidx
  on public.payments (omise_charge_id);

create index if not exists payments_user_id_idx
  on public.payments (user_id);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own"
  on public.payments
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own"
  on public.payments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
