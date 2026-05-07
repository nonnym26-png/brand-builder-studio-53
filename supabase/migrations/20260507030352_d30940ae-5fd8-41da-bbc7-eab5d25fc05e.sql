ALTER TABLE public.generated_designs
  ADD COLUMN IF NOT EXISTS quality_score numeric,
  ADD COLUMN IF NOT EXISTS quality_decision text,
  ADD COLUMN IF NOT EXISTS quality_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS quality_notes text,
  ADD COLUMN IF NOT EXISTS output_mode text,
  ADD COLUMN IF NOT EXISTS concept_index integer,
  ADD COLUMN IF NOT EXISTS concept_group_id uuid,
  ADD COLUMN IF NOT EXISTS model_used text,
  ADD COLUMN IF NOT EXISTS design_dna_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_generated_designs_concept_group
  ON public.generated_designs (concept_group_id);

CREATE INDEX IF NOT EXISTS idx_generated_designs_brand_profile
  ON public.generated_designs (brand_profile_id, created_at DESC);