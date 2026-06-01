-- =============================================================================
-- LabLIMS — run in Supabase SQL Editor
-- Microbiology results, custom tests, catalogue test kinds, auto-billing support
-- =============================================================================

-- 1) Structured microbiology (culture / organisms / drugs) on result lines
alter table public.order_test_lines
  add column if not exists microbiology_result jsonb;

-- 2) Custom tests per laboratory (Configure tests → Add test)
alter table public.lab_settings
  add column if not exists custom_tests jsonb not null default '[]'::jsonb;

-- 3) Catalogue test kind & profile constituents (optional; app falls back if missing)
do $$ begin
  create type catalogue_test_kind as enum (
    'profile',
    'quantitative',
    'qualitative',
    'microbiology'
  );
exception when duplicate_object then null;
end $$;

alter table public.catalogue_tests
  add column if not exists test_kind catalogue_test_kind,
  add column if not exists constituent_test_ids text[],
  add column if not exists result_style text;

-- Example: mark built-in MCS tests (ids match src/data/catalogue.ts)
update public.catalogue_tests
set
  test_kind = 'microbiology',
  result_style = 'microbiology_mcs'
where id in (
  't-urine-mcs',
  't-stool-mcs',
  't-blood-culture',
  't-hvs',
  't-wound'
);

-- 4) Verify
-- select column_name from information_schema.columns
-- where table_name = 'order_test_lines' and column_name = 'microbiology_result';
