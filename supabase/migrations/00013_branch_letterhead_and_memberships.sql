create table if not exists public.profile_branch_memberships (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.lab_branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, branch_id)
);

create index if not exists profile_branch_memberships_branch_idx
  on public.profile_branch_memberships (branch_id);

alter table public.lab_branches
  add column if not exists letterhead_pdf_data_url text;

alter table public.doctors
  add column if not exists branch_id uuid references public.lab_branches(id) on delete set null;

alter table public.patients
  add column if not exists branch_id uuid references public.lab_branches(id) on delete set null;

alter table public.lab_orders
  add column if not exists branch_id uuid references public.lab_branches(id) on delete set null;

alter table public.invoices
  add column if not exists branch_id uuid references public.lab_branches(id) on delete set null;

alter table public.profile_branch_memberships enable row level security;

drop policy if exists "profile_branch_memberships_all_same_lab" on public.profile_branch_memberships;
create policy "profile_branch_memberships_all_same_lab"
  on public.profile_branch_memberships
  for all to authenticated
  using (
    exists (
      select 1
      from public.lab_branches b
      where b.id = profile_branch_memberships.branch_id
        and b.laboratory_id = public.current_laboratory_id()
    )
  )
  with check (
    exists (
      select 1
      from public.lab_branches b
      where b.id = profile_branch_memberships.branch_id
        and b.laboratory_id = public.current_laboratory_id()
    )
  );
