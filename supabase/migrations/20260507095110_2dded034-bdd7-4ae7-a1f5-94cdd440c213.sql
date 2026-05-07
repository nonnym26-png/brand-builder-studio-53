ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS primary_color_note text,
  ADD COLUMN IF NOT EXISTS secondary_color_note text,
  ADD COLUMN IF NOT EXISTS accent_color_note text,
  ADD COLUMN IF NOT EXISTS neutral_color_note text;