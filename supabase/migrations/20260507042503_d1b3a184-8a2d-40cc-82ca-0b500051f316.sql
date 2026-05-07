
ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_notes text,
  ADD COLUMN IF NOT EXISTS final_file_link text,
  ADD COLUMN IF NOT EXISTS delivery_date timestamptz,
  ADD COLUMN IF NOT EXISTS internal_production_notes text,
  ADD COLUMN IF NOT EXISTS final_approval_date timestamptz,
  ADD COLUMN IF NOT EXISTS brand_kit_exported_at timestamptz;
