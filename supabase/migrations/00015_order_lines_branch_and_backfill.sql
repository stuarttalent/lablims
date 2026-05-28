-- Branch scoping on result lines + backfill from parent records

alter table public.order_test_lines
  add column if not exists branch_id uuid references public.lab_branches(id) on delete set null;

create index if not exists order_test_lines_branch_id_idx
  on public.order_test_lines (laboratory_id, branch_id);

-- Backfill branch_id from parent order where missing
update public.order_test_lines otl
set branch_id = o.branch_id
from public.lab_orders o
where otl.order_id = o.id
  and otl.branch_id is null
  and o.branch_id is not null;

update public.patients p
set branch_id = b.id
from public.lab_branches b
where p.branch_id is null
  and p.laboratory_id = b.laboratory_id
  and b.active = true
  and b.id = (
    select id from public.lab_branches lb
    where lb.laboratory_id = p.laboratory_id
    order by lb.created_at asc
    limit 1
  );

update public.lab_orders o
set branch_id = p.branch_id
from public.patients p
where o.branch_id is null
  and o.patient_id = p.id
  and p.branch_id is not null;

update public.invoices i
set branch_id = o.branch_id
from public.lab_orders o
where i.branch_id is null
  and i.order_id = o.id
  and o.branch_id is not null;
