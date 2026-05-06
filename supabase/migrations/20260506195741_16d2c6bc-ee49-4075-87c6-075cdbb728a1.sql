create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  client_name text,
  business_name text,
  phone_number text,
  email_address text,
  consultation_date date,
  preferred_contact_method text,
  project_status text default 'New Lead',
  project_priority text default 'Standard',
  internal_ab_notes text,

  industry text,
  business_description text,
  main_products_services text,
  years_in_business text,
  business_location_service_area text,
  business_stage text,
  target_customer text,
  customer_pain_points text,
  problem_solved text,
  business_differentiator text,
  competitors text,
  current_marketing_materials text,
  current_logo_status text,

  client_original_ideas text,
  client_brand_vision text,
  client_inspiration_notes text,
  client_must_have_elements text,
  client_nice_to_have_elements text,
  client_emotional_goal text,
  future_brand_vision text,

  colors_to_avoid text,
  fonts_to_avoid text,
  symbols_to_avoid text,
  shapes_to_avoid text,
  styles_to_avoid text,
  avoidance_checklist text[],
  other_avoidance_notes text,

  brand_goals text[],
  brand_personality text[],
  brand_feeling text,
  words_to_describe_brand text,
  words_not_to_describe_brand text,
  customer_long_term_vision text,
  ab_recommendation_notes text,

  logo_type_preferences text[],
  shape_preferences text[],
  orientation_preferences text[],
  font_style_preferences text[],
  mascot_symbol_ideas text,
  industry_symbols_to_consider text,
  symbols_to_avoid_logo text,
  include_initials text,
  initials_abbreviation text,
  include_tagline text,
  tagline_ideas text,
  logo_direction_notes text,

  digital_usage text[],
  needs_icon_only text,
  needs_small_size_readability text,
  needs_square_version text,
  needs_circular_version text,
  needs_horizontal_header text,
  needs_favicon text,
  digital_usage_notes text,

  print_usage text[],
  needs_one_color text,
  needs_black_white text,
  needs_white_on_dark text,
  needs_embroidery_friendly text,
  needs_distance_readability text,
  needs_small_large_format text,
  needs_simplified_print_version text,
  print_production_notes text,

  primary_color_name text,
  primary_hex text,
  primary_pantone text,
  secondary_color_name text,
  secondary_hex text,
  secondary_pantone text,
  accent_color_name text,
  accent_hex text,
  accent_pantone text,
  neutral_color_name text,
  neutral_hex text,
  neutral_pantone text,
  color_mood text[],
  color_notes text,

  vector_rules_checklist text[],
  vector_output_confirmed boolean default false,
  vector_preparation_notes text,

  logo_version_needs text[],
  logo_version_notes text,
  priority_logo_versions text,

  required_file_formats text[],
  priority_file_outputs text,

  branding_kit_needs text[],
  branding_kit_notes text,

  consultation_notes_client_story text,
  ab_creative_direction_notes text,
  ab_professional_recommendation text,
  recommended_next_step text,

  brand_profile_summary text,
  is_draft boolean default true,
  is_complete boolean default false,
  ready_for_phase_2 boolean default false,

  phase_2_logo_concepts jsonb,
  selected_logo_concept jsonb,
  phase_2_ai_prompt text,
  phase_2_concept_notes text,
  phase_2_refinement_notes text
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_brand_profiles_updated_at on public.brand_profiles;
create trigger trg_brand_profiles_updated_at
before update on public.brand_profiles
for each row execute function public.set_updated_at();

-- Enable RLS. No policies yet — table is locked down by default.
-- Access policies will be added in a later phase once auth/ownership is defined.
alter table public.brand_profiles enable row level security;