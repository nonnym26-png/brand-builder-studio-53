
ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS phase_1_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS phase_2_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS phase_3_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS phase_2_slogans jsonb,
  ADD COLUMN IF NOT EXISTS phase_2_elements jsonb,
  ADD COLUMN IF NOT EXISTS phase_2_mascot jsonb,
  ADD COLUMN IF NOT EXISTS phase_2_fonts jsonb,
  ADD COLUMN IF NOT EXISTS phase_3_assets jsonb;
