do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_currency') then
    create type invoice_currency as enum ('USD', 'ZWL');
  end if;
end $$;

alter table public.invoices
  add column if not exists currency_code invoice_currency not null default 'USD';
