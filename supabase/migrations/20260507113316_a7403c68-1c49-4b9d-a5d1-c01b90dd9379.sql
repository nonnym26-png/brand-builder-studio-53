ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS phase_3_brand_kit_data jsonb,
  ADD COLUMN IF NOT EXISTS phase_3_saved_at timestamp with time zone;