-- Clinical context on patient demographics (not per order / result entry).

alter table public.patients
  add column if not exists clinical_symptoms text,
  add column if not exists clinical_history text;

-- Copy existing order-level symptoms onto the patient (latest non-null per patient).
update public.patients p
set clinical_symptoms = sub.clinical_symptoms
from (
  select distinct on (o.patient_id)
    o.patient_id,
    o.clinical_symptoms
  from public.lab_orders o
  where o.clinical_symptoms is not null
    and trim(o.clinical_symptoms) <> ''
  order by o.patient_id, o.updated_at desc nulls last, o.created_at desc
) sub
where p.id = sub.patient_id
  and (p.clinical_symptoms is null or trim(p.clinical_symptoms) = '');
