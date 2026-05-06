ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS design_dna jsonb,
  ADD COLUMN IF NOT EXISTS design_dna_generated_at timestamptz;