/**
 * Brand Profile loader — pulls the raw brand_profiles row and reduces it
 * to a typed `BrandProfileSummary` the rest of the pipeline can consume.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { BrandProfileSummary } from "./types";

function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
}
function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export async function loadBrandProfileSummary(
  brandProfileId: string,
  extras?: BrandProfileSummary["extras"],
): Promise<BrandProfileSummary> {
  const { data: p, error } = await supabaseAdmin
    .from("brand_profiles")
    .select("*")
    .eq("id", brandProfileId)
    .single();
  if (error || !p) throw new Error("Brand profile not found");

  const row = p as Record<string, unknown>;
  const businessName = str(row.business_name).trim();

  return {
    brandProfileId,
    businessName,
    exactLogoText: businessName,
    industry: str(row.industry),
    services: str(row.main_products_services) || str(row.business_description),
    targetCustomer: str(row.target_customer),
    differentiator: str(row.business_differentiator),
    personality: arr(row.brand_personality),
    feeling: str(row.brand_feeling) || str(row.client_emotional_goal),
    vision: str(row.client_brand_vision),
    mustHave: str(row.client_must_have_elements),
    niceToHave: str(row.client_nice_to_have_elements),
    taglineIdeas: str(row.tagline_ideas),
    inspiration: str(row.client_inspiration_notes),
    primaryHex: str(row.primary_hex) || undefined,
    accentHex: str(row.accent_hex) || undefined,
    neutralHex: str(row.neutral_hex) || undefined,
    preferredColors: [
      str(row.primary_color_name),
      str(row.secondary_color_name),
      str(row.accent_color_name),
    ]
      .filter(Boolean)
      .join(", "),
    colorMood: arr(row.color_mood),
    colorsToAvoid: str(row.colors_to_avoid),
    fontStylePreferences: arr(row.font_style_preferences),
    logoTypePreferences: arr(row.logo_type_preferences),
    shapePreferences: arr(row.shape_preferences),
    digitalUsage: arr(row.digital_usage),
    printUsage: arr(row.print_usage),
    symbolsToAvoid: str(row.symbols_to_avoid) || str(row.symbols_to_avoid_logo),
    shapesToAvoid: str(row.shapes_to_avoid),
    stylesToAvoid: str(row.styles_to_avoid),
    fontsToAvoid: str(row.fonts_to_avoid),
    avoidanceChecklist: arr(row.avoidance_checklist),
    mascotIdeas: str(row.mascot_symbol_ideas),
    initials: str(row.initials_abbreviation) || businessName.charAt(0).toUpperCase(),
    includeTagline: str(row.include_tagline),
    competitors: str(row.competitors),
    extras,
  };
}