alter table public.invoices
  add column if not exists medical_aid_details jsonb;
