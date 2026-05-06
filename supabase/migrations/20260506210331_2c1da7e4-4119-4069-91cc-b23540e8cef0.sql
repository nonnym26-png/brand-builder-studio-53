-- logo_renderings already exists; keep idempotent in case of fresh environments
create table if not exists public.logo_renderings (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  concept_name text,
  concept_type text,
  design_tier text default 'Agency-Level',
  layout_style text,
  shape_system text,
  typography_system text,
  symbol_system text,
  color_system jsonb,
  svg_markup text,
  strategic_value_statement text,
  production_value_statement text,
  brand_recognition_statement text,
  why_not_generic text,
  business_growth_value text,
  rendering_notes text,
  production_notes text,
  variation_notes text,
  why_this_works text,
  production_risks text,
  refinement_recommendations text,
  one_color_version_notes text,
  social_media_version_notes text,
  print_apparel_signage_notes text,
  diamond_score jsonb,
  status text default 'Generated',
  is_favorite boolean default false,
  is_selected boolean default false,
  ready_for_phase_3 boolean default false
);

alter table public.logo_renderings enable row level security;

alter table public.brand_profiles
  add column if not exists selected_logo_rendering_id uuid references public.logo_renderings(id) on delete set null,
  add column if not exists phase_2_rendering_status text default 'Not Started',
  add column if not exists diamond_recommendation_notes text,
  add column if not exists ready_for_phase_3 boolean default false;