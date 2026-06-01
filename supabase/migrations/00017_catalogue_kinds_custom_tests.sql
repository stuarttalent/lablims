-- Test result kinds, custom laboratory tests, microbiology structured results

-- Structured microbiology (MCS) on result lines
alter table public.order_test_lines
  add column if not exists microbiology_result jsonb;

-- Custom tests defined per laboratory (Configure tests UI)
alter table public.lab_settings
  add column if not exists custom_tests jsonb not null default '[]'::jsonb;

-- Catalogue metadata for result entry style
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

comment on column public.order_test_lines.microbiology_result is
  'Culture, organisms, and antibiogram JSON for MCS-style tests';
comment on column public.lab_settings.custom_tests is
  'Laboratory-defined tests from Configure tests (JSON array matching app CatalogueTest)';
