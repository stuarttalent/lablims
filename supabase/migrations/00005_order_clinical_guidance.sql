-- Structured EDLIZ-informed AI guidance (impressions, suggested tests, references)
alter table public.lab_orders
  add column if not exists ai_clinical_guidance jsonb;
