-- OPTIONAL: Create demo Auth users via SQL (Supabase hosted projects).
-- Requires pgcrypto and service-role execution, OR run users via Dashboard:
-- Authentication → Users → Add user (email + password "demo")
--
-- Demo emails (password for all: demo):
--   director@metropolitanclinlab.org       super_admin
--   t.moyo@metropolitanclinlab.org         admin
--   c.ndlovu@metropolitanclinlab.org        scientist
--   k.makoni@metropolitanclinlab.org       tech
--   n.gondo@metropolitanclinlab.org        biller
--   b.mutasa@rehabmed.co.zw                doctor
--
-- After users exist, upsert profiles (replace auth user ids from auth.users):

-- Example: link profiles once auth.users rows exist
/*
insert into public.profiles (id, laboratory_id, legacy_id, email, full_name, role, professional_credential)
select
  u.id,
  'a0000000-0000-4000-8000-000000000001',
  v.legacy_id,
  u.email,
  v.full_name,
  v.role::user_role,
  v.credential
from auth.users u
join (values
  ('director@metropolitanclinlab.org', 'u-super', 'Dr. Anesu Shumba', 'super_admin', 'MD, FRCPath · Laboratory director · HPCZ R12104'),
  ('t.moyo@metropolitanclinlab.org', 'u-admin', 'Tariro Moyo', 'admin', 'BMLS · Senior laboratory manager · HPCZ L8841'),
  ('c.ndlovu@metropolitanclinlab.org', 'u-scientist', 'Dr. Chipo Ndlovu', 'scientist', 'PhD, MLS · Principal scientist · HPCZ S4402'),
  ('k.makoni@metropolitanclinlab.org', 'u-tech', 'Kudzai Makoni', 'tech', 'BMLS · Medical laboratory technologist · HPCZ T2093'),
  ('n.gondo@metropolitanclinlab.org', 'u-biller', 'Nyasha Gondo', 'biller', 'Finance officer · Patient accounts'),
  ('b.mutasa@rehabmed.co.zw', 'u-doctor', 'Dr. Brian Mutasa', 'doctor', 'MBChB · Consultant physician · MPZ R7721')
) as v(email, legacy_id, full_name, role, credential) on lower(u.email) = lower(v.email)
on conflict (id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  professional_credential = excluded.professional_credential,
  legacy_id = excluded.legacy_id;
*/

-- Enable Realtime (optional) for worklist dashboards:
-- alter publication supabase_realtime add table public.lab_orders;
-- alter publication supabase_realtime add table public.order_test_lines;
