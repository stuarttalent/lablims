-- =============================================================================
-- LabLIMS — run in Supabase SQL Editor (one block at a time if enum errors occur)
-- Ensures latest features: multi-lab, branches, currency, letterheads, suspension,
-- result amendments, and branch_id on all operational data.
-- =============================================================================

-- 1) Payment methods (run each ALTER separately if Postgres complains about enum)
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Corporate accounts';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Staff';

-- 2) Invoice currency
DO $$ BEGIN
  CREATE TYPE invoice_currency AS ENUM ('USD', 'ZWL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS currency_code invoice_currency NOT NULL DEFAULT 'USD';

-- 3) Lab manager role (commit before using the new enum value in policies)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lab_manager';

-- 4) Branches + profile branch assignment
CREATE TABLE IF NOT EXISTS public.lab_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  active boolean NOT NULL DEFAULT true,
  letterhead_pdf_data_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_branches_laboratory_id_idx
  ON public.lab_branches (laboratory_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.lab_branches(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- 5) Branch on core tables
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.lab_branches(id) ON DELETE SET NULL;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.lab_branches(id) ON DELETE SET NULL;

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.lab_branches(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.lab_branches(id) ON DELETE SET NULL;

ALTER TABLE public.order_test_lines
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.lab_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_test_lines_branch_id_idx
  ON public.order_test_lines (laboratory_id, branch_id);

-- 6) Multi-branch memberships
CREATE TABLE IF NOT EXISTS public.profile_branch_memberships (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.lab_branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, branch_id)
);

ALTER TABLE public.lab_settings
  ADD COLUMN IF NOT EXISTS letterhead_a4_pdf_data_url text;

-- 7) Result amendments on analyte lines
ALTER TABLE public.order_test_lines
  ADD COLUMN IF NOT EXISTS amendments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 8) Backfill branch_id so rows are not hidden after reload
UPDATE public.order_test_lines otl
SET branch_id = o.branch_id
FROM public.lab_orders o
WHERE otl.order_id = o.id
  AND otl.branch_id IS NULL
  AND o.branch_id IS NOT NULL;

UPDATE public.lab_orders o
SET branch_id = p.branch_id
FROM public.patients p
WHERE o.branch_id IS NULL
  AND o.patient_id = p.id
  AND p.branch_id IS NOT NULL;

UPDATE public.invoices i
SET branch_id = COALESCE(i.branch_id, o.branch_id)
FROM public.lab_orders o
WHERE i.order_id = o.id
  AND i.branch_id IS NULL
  AND o.branch_id IS NOT NULL;

-- 9) Assign staff to a default branch if missing (edit laboratory_id as needed)
-- UPDATE public.profiles
-- SET branch_id = (
--   SELECT id FROM public.lab_branches
--   WHERE laboratory_id = profiles.laboratory_id
--   ORDER BY created_at ASC LIMIT 1
-- )
-- WHERE branch_id IS NULL AND laboratory_id IS NOT NULL;
