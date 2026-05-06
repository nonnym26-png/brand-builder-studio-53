CREATE TABLE public.design_dna (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_profile_id uuid NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  design_style text,
  brand_personality_summary text,
  visual_tone text,
  typography_direction text,
  primary_font_style text,
  secondary_font_style text,
  letter_spacing_style text,
  monogram_direction text,
  symbol_direction text,
  shape_language text,
  line_style text,
  spacing_rules text,
  color_hierarchy text,
  accent_color_usage text,
  layout_system text,
  composition_notes text,
  premium_design_rules text,
  production_rules text,
  social_media_rules text,
  logo_variation_rules text,
  avoidance_rules text,
  designer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_dna_brand_profile_id ON public.design_dna(brand_profile_id);

ALTER TABLE public.design_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to design_dna"
  ON public.design_dna FOR SELECT USING (true);

CREATE POLICY "Allow all insert access to design_dna"
  ON public.design_dna FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update access to design_dna"
  ON public.design_dna FOR UPDATE USING (true);

CREATE POLICY "Allow all delete access to design_dna"
  ON public.design_dna FOR DELETE USING (true);

CREATE TRIGGER set_design_dna_updated_at
BEFORE UPDATE ON public.design_dna
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();