do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'lab_manager'
  ) then
    alter type user_role add value 'lab_manager';
  end if;
end $$;

create table if not exists public.lab_branches (
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

create index if not exists lab_branches_laboratory_id_idx
  on public.lab_branches (laboratory_id);

alter table public.profiles
  add column if not exists branch_id uuid references public.lab_branches (id) on delete set null;

create index if not exists profiles_branch_id_idx on public.profiles (branch_id);

drop trigger if exists lab_branches_updated_at on public.lab_branches;
create trigger lab_branches_updated_at
before update on public.lab_branches
for each row execute function public.set_updated_at();

alter table public.lab_branches enable row level security;

drop policy if exists "lab_branches_all_same_lab" on public.lab_branches;
create policy "lab_branches_all_same_lab"
  on public.lab_branches for all to authenticated
  using (laboratory_id = public.current_laboratory_id())
  with check (laboratory_id = public.current_laboratory_id());
