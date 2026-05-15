-- Seed default laboratory, settings, doctors, and demo staff profile placeholders.
-- After running: create Auth users in Supabase Dashboard (or sign-up API) with
-- matching emails, then run 00003_link_demo_profiles.sql

insert into public.laboratories (id, slug, name)
values (
  'a0000000-0000-4000-8000-000000000001',
  'main',
  'Metropolitan Clinical Laboratory'
)
on conflict (slug) do nothing;

insert into public.lab_settings (
  laboratory_id,
  lab_name,
  tagline,
  address,
  phone,
  email,
  registration_number,
  report_footer,
  fhir_base_url,
  fhir_organization_id,
  lims_instance_id
)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Metropolitan Clinical Laboratory',
  'Quality diagnostics · Harare',
  '45 Health Park Drive, Milton Park, Harare, Zimbabwe',
  '+263 242 774 200',
  'reports@metropolitanclinlab.org',
  'MLI-ZW-2019-0847',
  'Results relate only to the specimen received. Interpretation should be made in the full clinical context. For queries contact the laboratory using the details above.',
  'https://fhir.metropolitanclinlab.org/R4',
  'lab-main',
  'b0000000-0000-4000-8000-000000000001'
)
on conflict (laboratory_id) do update set
  lab_name = excluded.lab_name,
  tagline = excluded.tagline;

insert into public.doctors (laboratory_id, legacy_id, name, specialty) values
  ('a0000000-0000-4000-8000-000000000001', 'd1', 'Dr. Brian Mutasa', 'General Practice'),
  ('a0000000-0000-4000-8000-000000000001', 'd2', 'Dr. Chipo Ndlovu', 'Clinical Pathology'),
  ('a0000000-0000-4000-8000-000000000001', 'd3', 'Dr. Rudo Chikwanha', 'Paediatrics'),
  ('a0000000-0000-4000-8000-000000000001', 'd4', 'Dr. Takudzwa Maphosa', 'Internal Medicine'),
  ('a0000000-0000-4000-8000-000000000001', 'd5', 'Dr. Anesu Sibanda', 'Obstetrics')
on conflict do nothing;

-- Core catalogue tests (subset — import full list from app or extend this script)
insert into public.catalogue_tests (
  laboratory_id, id, name, loinc_code, department, sample_type,
  turnaround_time, price, reference_range, units, panel_analyte
) values
  ('a0000000-0000-4000-8000-000000000001', 't-glucose', 'Glucose (fasting)', '2345-7', 'Chemistry', 'Serum', '4 hours', 8.00, 'Fasting 3.9–5.5 mmol/L', 'mmol/L', false),
  ('a0000000-0000-4000-8000-000000000001', 't-lipid-total', 'Total cholesterol', '2093-3', 'Chemistry', 'Serum (fasting preferred)', '6 hours', 26.00, '< 5.0 mmol/L', 'mmol/L', true),
  ('a0000000-0000-4000-8000-000000000001', 't-lipid-hdl', 'HDL cholesterol', '2085-9', 'Chemistry', 'Serum (fasting preferred)', '6 hours', 0.00, '> 1.0 mmol/L', 'mmol/L', true),
  ('a0000000-0000-4000-8000-000000000001', 't-lipid-ldl', 'LDL cholesterol', '13457-7', 'Chemistry', 'Serum (fasting preferred)', '6 hours', 0.00, '< 3.0 mmol/L', 'mmol/L', true),
  ('a0000000-0000-4000-8000-000000000001', 't-lipid-tg', 'Triglycerides', '2571-8', 'Chemistry', 'Serum (fasting preferred)', '6 hours', 0.00, '< 1.7 mmol/L', 'mmol/L', true),
  ('a0000000-0000-4000-8000-000000000001', 't-fbc-wbc', 'WBC', '6690-2', 'Haematology', 'EDTA whole blood', '4 hours', 0.00, '4.0–11.0 ×10⁹/L', '×10⁹/L', true),
  ('a0000000-0000-4000-8000-000000000001', 't-fbc-hb', 'Haemoglobin', '718-7', 'Haematology', 'EDTA whole blood', '4 hours', 0.00, '13–17 (M), 12–16 (F) g/dL', 'g/dL', true),
  ('a0000000-0000-4000-8000-000000000001', 't-hba1c', 'HbA1c', '4548-4', 'Chemistry', 'Serum', '24 hours', 35.00, '< 6.5%', '%', false),
  ('a0000000-0000-4000-8000-000000000001', 't-hiv', 'HIV screening', null, 'Serology/Immunology', 'Serum', '4 hours', 12.00, 'Non-reactive', '—', false),
  ('a0000000-0000-4000-8000-000000000001', 't-hbsag', 'HBsAg', null, 'Serology/Immunology', 'Serum', '4 hours', 10.00, 'Non-reactive', '—', false)
on conflict (laboratory_id, id) do nothing;
