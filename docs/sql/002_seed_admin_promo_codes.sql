-- Demo promo codes for the admin promo-code list.
-- Run this in Supabase SQL Editor with an admin/service-role context.

insert into public.promo_codes
  (code, discount_type, discount_value, min_purchase_amount, starts_at, is_active)
values
  ('NEWYEAR200', 'fixed', 200, 0, '2022-12-02 22:30:00+07', true),
  ('MERRYX25', 'percent', 25, 1200, '2022-12-02 22:30:00+07', true),
  ('BDAY2025', 'fixed', 200, 0, '2022-12-02 22:30:00+07', true),
  ('NEWMEMBER', 'fixed', 300, 3000, '2022-12-02 22:30:00+07', true),
  ('1212PKDS', 'percent', 12, 0, '2022-12-02 22:30:00+07', true)
on conflict (code) do nothing;
