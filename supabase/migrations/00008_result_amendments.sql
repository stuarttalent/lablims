alter table public.order_test_lines
  add column if not exists amendments jsonb not null default '[]'::jsonb;
