CREATE TABLE public.logo_renderings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_profile_id UUID NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  concept_name TEXT,
  concept_type TEXT,
  design_tier TEXT DEFAULT 'Agency-Level',
  layout_style TEXT,
  shape_system TEXT,
  typography_system TEXT,
  symbol_system TEXT,

  color_system JSONB,

  svg_markup TEXT,

  strategic_value_statement TEXT,
  production_value_statement TEXT,
  brand_recognition_statement TEXT,
  why_not_generic TEXT,
  business_growth_value TEXT,

  rendering_notes TEXT,
  production_notes TEXT,
  variation_notes TEXT,
  why_this_works TEXT,
  production_risks TEXT,
  refinement_recommendations TEXT,

  one_color_version_notes TEXT,
  social_media_version_notes TEXT,
  print_apparel_signage_notes TEXT,

  diamond_score JSONB,

  status TEXT NOT NULL DEFAULT 'draft',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  ready_for_phase_3 BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_logo_renderings_brand_profile_id ON public.logo_renderings(brand_profile_id);
CREATE INDEX idx_logo_renderings_status ON public.logo_renderings(status);

ALTER TABLE public.logo_renderings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER logo_renderings_set_updated_at
BEFORE UPDATE ON public.logo_renderings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();