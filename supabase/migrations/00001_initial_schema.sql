-- ALS Health / LabLIMS — Supabase initial schema
-- Run in Supabase SQL Editor or: supabase db push
-- Maps to src/types/index.ts and DemoStore shape

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (match TypeScript unions)
-- ---------------------------------------------------------------------------
create type user_role as enum (
  'super_admin',
  'lab_manager',
  'admin',
  'scientist',
  'tech',
  'biller',
  'doctor'
);

create type test_department as enum (
  'Haematology',
  'Chemistry',
  'Microbiology',
  'Serology/Immunology',
  'Molecular'
);

create type order_priority as enum ('Routine', 'Urgent', 'STAT');

create type order_status as enum (
  'Requested',
  'Sample Collected',
  'In Progress',
  'Pending Verification',
  'Verified',
  'Released'
);

create type result_flag as enum ('Normal', 'Low', 'High', 'Critical');

create type line_result_status as enum (
  'Draft',
  'Pending Verification',
  'Verified',
  'Released'
);

create type payment_method as enum (
  'Cash',
  'EcoCash',
  'Swipe',
  'Bank Transfer',
  'Medical Aid',
  'Corporate accounts',
  'Staff'
);

create type payment_status as enum ('Paid', 'Partially Paid', 'Unpaid');
create type invoice_currency as enum ('USD', 'ZWL');

-- ---------------------------------------------------------------------------
-- Laboratory (tenant root — one row per deployment / site)
-- ---------------------------------------------------------------------------
create table public.laboratories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'main',
  name text not null default 'Metropolitan Clinical Laboratory',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lab_branches (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  name text not null,
  code text,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, name)
);

create index lab_branches_laboratory_id_idx on public.lab_branches (laboratory_id);

-- ---------------------------------------------------------------------------
-- Staff profiles (extends Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  branch_id uuid references public.lab_branches (id) on delete set null,
  legacy_id text unique,
  email text not null,
  full_name text not null,
  role user_role not null default 'tech',
  suspended_at timestamptz,
  professional_credential text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_laboratory_id_idx on public.profiles (laboratory_id);
create index profiles_branch_id_idx on public.profiles (branch_id);
create index profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Lab settings (one row per laboratory)
-- ---------------------------------------------------------------------------
create table public.lab_settings (
  laboratory_id uuid primary key references public.laboratories (id) on delete cascade,
  lab_name text not null,
  tagline text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  registration_number text not null default '',
  report_footer text not null default '',
  departments text[] not null default array[
    'Haematology',
    'Chemistry',
    'Microbiology',
    'Serology/Immunology',
    'Molecular'
  ],
  fhir_base_url text,
  fhir_organization_id text default 'lab-main',
  lims_instance_id uuid not null default gen_random_uuid(),
  logo_data_url text,
  price_overrides jsonb not null default '{}'::jsonb,
  catalogue_overrides jsonb not null default '{}'::jsonb,
  store_version int not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Referring doctors
-- ---------------------------------------------------------------------------
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  legacy_id text,
  name text not null,
  specialty text not null default '',
  created_at timestamptz not null default now(),
  unique (laboratory_id, legacy_id)
);

create index doctors_laboratory_id_idx on public.doctors (laboratory_id);

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  legacy_id text,
  full_name text not null,
  date_of_birth date not null,
  age int not null,
  gender text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  referring_doctor text not null default '',
  medical_aid text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, legacy_id)
);

create index patients_laboratory_id_idx on public.patients (laboratory_id);
create index patients_full_name_idx on public.patients (laboratory_id, full_name);

-- ---------------------------------------------------------------------------
-- Test catalogue (string ids match src/data/catalogue.ts)
-- ---------------------------------------------------------------------------
create table public.catalogue_tests (
  id text not null,
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  name text not null,
  loinc_code text,
  department test_department not null,
  sample_type text not null,
  turnaround_time text not null,
  price numeric(12, 2) not null default 0,
  reference_range text,
  units text,
  panel_analyte boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (laboratory_id, id)
);

create index catalogue_tests_department_idx on public.catalogue_tests (laboratory_id, department);

-- ---------------------------------------------------------------------------
-- Laboratory orders (accessions)
-- ---------------------------------------------------------------------------
create table public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  legacy_id text,
  patient_id uuid not null references public.patients (id) on delete restrict,
  sample_type text not null,
  priority order_priority not null default 'Routine',
  requesting_doctor text not null default '',
  collection_date timestamptz not null,
  status order_status not null default 'Requested',
  notes text,
  clinical_symptoms text,
  ai_generated_comment text,
  include_ai_comment_in_report boolean not null default false,
  assigned_tech_id uuid references public.profiles (id) on delete set null,
  assigned_scientist_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, legacy_id)
);

create index lab_orders_laboratory_id_idx on public.lab_orders (laboratory_id);
create index lab_orders_patient_id_idx on public.lab_orders (patient_id);
create index lab_orders_status_idx on public.lab_orders (laboratory_id, status);
create index lab_orders_collection_date_idx on public.lab_orders (laboratory_id, collection_date desc);

-- ---------------------------------------------------------------------------
-- Order test lines (results)
-- ---------------------------------------------------------------------------
create table public.order_test_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.lab_orders (id) on delete cascade,
  test_id text not null,
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  result_value text,
  units text,
  reference_range text,
  flag result_flag,
  comment text,
  entered_by_name text,
  entered_by_credential text,
  verified_by_name text,
  verified_by_credential text,
  verification_date date,
  result_status line_result_status,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (laboratory_id, test_id) references public.catalogue_tests (laboratory_id, id),
  unique (order_id, test_id)
);

create index order_test_lines_order_id_idx on public.order_test_lines (order_id);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories (id) on delete cascade,
  legacy_id text,
  invoice_number text not null,
  patient_id uuid not null references public.patients (id) on delete restrict,
  order_id uuid references public.lab_orders (id) on delete set null,
  test_ids text[] not null default '{}',
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency_code invoice_currency not null default 'USD',
  payment_method payment_method,
  payment_status payment_status not null default 'Unpaid',
  receipt_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, invoice_number),
  unique (laboratory_id, legacy_id)
);

create index invoices_laboratory_id_idx on public.invoices (laboratory_id);
create index invoices_patient_id_idx on public.invoices (patient_id);

-- ---------------------------------------------------------------------------
-- Helpers: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger laboratories_updated_at
  before update on public.laboratories
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger lab_branches_updated_at
  before update on public.lab_branches
  for each row execute function public.set_updated_at();

create trigger patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

create trigger catalogue_tests_updated_at
  before update on public.catalogue_tests
  for each row execute function public.set_updated_at();

create trigger lab_orders_updated_at
  before update on public.lab_orders
  for each row execute function public.set_updated_at();

create trigger order_test_lines_updated_at
  before update on public.order_test_lines
  for each row execute function public.set_updated_at();

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger lab_settings_updated_at
  before update on public.lab_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on auth signup (optional — link to default lab)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_lab_id uuid;
begin
  select id into default_lab_id from public.laboratories where slug = 'main' limit 1;

  if default_lab_id is null then
    insert into public.laboratories (slug, name)
    values ('main', 'Metropolitan Clinical Laboratory')
    returning id into default_lab_id;
  end if;

  insert into public.profiles (id, laboratory_id, email, full_name, role)
  values (
    new.id,
    default_lab_id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'tech')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.laboratories enable row level security;
alter table public.profiles enable row level security;
alter table public.lab_branches enable row level security;
alter table public.lab_settings enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.catalogue_tests enable row level security;
alter table public.lab_orders enable row level security;
alter table public.order_test_lines enable row level security;
alter table public.invoices enable row level security;

-- Current user's laboratory
create or replace function public.current_laboratory_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select laboratory_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles: read own lab; update own row
create policy "profiles_select_same_lab"
  on public.profiles for select to authenticated
  using (laboratory_id = public.current_laboratory_id());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid());

create policy "lab_branches_all_same_lab"
  on public.lab_branches for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

-- Laboratory & settings: same lab
create policy "laboratories_select_own"
  on public.laboratories for select to authenticated
  using (id = public.current_laboratory_id());

create policy "lab_settings_select_own"
  on public.lab_settings for select to authenticated
  using (laboratory_id = public.current_laboratory_id());

create policy "lab_settings_update_admin"
  on public.lab_settings for update to authenticated
  using (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() in ('admin', 'super_admin')
  );

-- Clinical / ops tables: same laboratory
create policy "doctors_all_same_lab"
  on public.doctors for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

create policy "patients_all_same_lab"
  on public.patients for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

create policy "catalogue_tests_all_same_lab"
  on public.catalogue_tests for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

create policy "lab_orders_all_same_lab"
  on public.lab_orders for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

create policy "order_test_lines_all_same_lab"
  on public.order_test_lines for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

create policy "invoices_all_same_lab"
  on public.invoices for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());

-- ---------------------------------------------------------------------------
-- Convenience views (optional — use from app or SQL)
-- ---------------------------------------------------------------------------
create or replace view public.lab_orders_with_patient as
select
  o.*,
  p.full_name as patient_full_name,
  p.legacy_id as patient_legacy_id
from public.lab_orders o
join public.patients p on p.id = o.patient_id;

grant select on public.lab_orders_with_patient to authenticated;
