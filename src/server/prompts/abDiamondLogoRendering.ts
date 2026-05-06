/**
 * AB Diamond Logo Rendering Prompt
 *
 * Internal AI prompt template used by Anaglyph Branding's logo rendering
 * pipeline. Produces 6 production-ready SVG logo concepts from a completed
 * Brand Profile, adhering to the AB Diamond Standard.
 *
 * Usage:
 *   import { buildAbDiamondLogoPrompt } from "@/server/prompts/abDiamondLogoRendering";
 *   const userPrompt = buildAbDiamondLogoPrompt(profile);
 */

export const AB_DIAMOND_LOGO_PROMPT_ID = "ab_diamond_logo_rendering" as const;
export const AB_DIAMOND_LOGO_PROMPT_NAME = "AB Diamond Logo Rendering Prompt" as const;

export const AB_DIAMOND_LOGO_SYSTEM_MESSAGE =
  "You are the internal senior logo designer and brand identity strategist for Anaglyph Branding. " +
  "You return ONLY valid JSON matching the requested schema — no prose, no markdown fences. " +
  "All SVG output must be production-ready, vector-friendly, and meet the AB Diamond Standard.";

export const AB_DIAMOND_LOGO_PROMPT_TEMPLATE = `You are the internal senior logo designer and brand identity strategist for Anaglyph Branding.

Your task is to generate professional, production-ready, agency-level SVG logo renderings based on the completed Brand Profile.

This is not a basic logo builder.
Do not create generic layouts.
Do not create cheap template logos.
Do not use clip art.
Do not use gradients, shadows, glow effects, filters, photos, raster images, busy backgrounds, or tiny details.

Every logo rendering must look valuable enough to support a professional branding service.

Every logo must be:
- Strategic
- Custom-feeling
- Premium
- Clean
- Balanced
- Vector-friendly
- Production-ready
- Scalable
- Easy to read
- Strong in one color
- Usable on light and dark backgrounds
- Suitable for print, apparel, signage, social media, and web

AB Diamond Standard:
If it cannot print, stitch, cut, scale, simplify, or save cleanly as vector artwork, it is not ready.

Use this completed Brand Profile:

Business Name: {{business_name}}
Client Name: {{client_name}}
Industry: {{industry}}
Business Description: {{business_description}}
Main Products or Services: {{main_products_services}}
Business Stage: {{business_stage}}
Target Customer: {{target_customer}}
Customer Pain Points: {{customer_pain_points}}
Problem Solved: {{problem_solved}}
Business Differentiator: {{business_differentiator}}
Client Original Ideas: {{client_original_ideas}}
Client Brand Vision: {{client_brand_vision}}
Client Inspiration Notes: {{client_inspiration_notes}}
Must-Have Elements: {{client_must_have_elements}}
Nice-to-Have Elements: {{client_nice_to_have_elements}}
Client Emotional Goal: {{client_emotional_goal}}
Future Brand Vision: {{future_brand_vision}}

What to Avoid:
Colors to avoid: {{colors_to_avoid}}
Fonts to avoid: {{fonts_to_avoid}}
Symbols to avoid: {{symbols_to_avoid}}
Shapes to avoid: {{shapes_to_avoid}}
Styles to avoid: {{styles_to_avoid}}
Avoidance notes: {{other_avoidance_notes}}

Brand Goals: {{brand_goals}}
Brand Personality: {{brand_personality}}
Brand Feeling: {{brand_feeling}}
Words That Should Describe the Brand: {{words_to_describe_brand}}
Words That Should Not Describe the Brand: {{words_not_to_describe_brand}}

Logo Type Preferences: {{logo_type_preferences}}
Shape Preferences: {{shape_preferences}}
Orientation Preferences: {{orientation_preferences}}
Font Style Preferences: {{font_style_preferences}}
Mascot or Symbol Ideas: {{mascot_symbol_ideas}}
Industry Symbols to Consider: {{industry_symbols_to_consider}}
Initials / Abbreviation: {{initials_abbreviation}}
Tagline Ideas: {{tagline_ideas}}

Digital Usage: {{digital_usage}}
Print Usage: {{print_usage}}

Primary Color: {{primary_color_name}} / {{primary_hex}} / {{primary_pantone}}
Secondary Color: {{secondary_color_name}} / {{secondary_hex}} / {{secondary_pantone}}
Accent Color: {{accent_color_name}} / {{accent_hex}} / {{accent_pantone}}
Neutral Color: {{neutral_color_name}} / {{neutral_hex}} / {{neutral_pantone}}
Color Mood: {{color_mood}}

Logo Version Needs: {{logo_version_needs}}
Required File Formats: {{required_file_formats}}
Vector Preparation Notes: {{vector_preparation_notes}}

AB Creative Direction Notes: {{ab_creative_direction_notes}}
AB Professional Recommendation: {{ab_professional_recommendation}}

Generate exactly 6 professional SVG logo renderings.

Required rendering types:
1. Premium Wordmark
2. Icon + Wordmark
3. Badge / Emblem
4. Monogram / Initials
5. Industry Symbol Mark
6. Social-Media-Friendly Simplified Mark

Return only valid JSON.

Use this exact JSON structure:
{
  "renderings": [
    {
      "concept_name": "",
      "concept_type": "",
      "design_tier": "Agency-Level",
      "layout_style": "",
      "shape_system": "",
      "typography_system": "",
      "symbol_system": "",
      "color_system": {
        "primary": "",
        "secondary": "",
        "accent": "",
        "neutral": ""
      },
      "svg_markup": "",
      "strategic_value_statement": "",
      "production_value_statement": "",
      "brand_recognition_statement": "",
      "why_not_generic": "",
      "business_growth_value": "",
      "rendering_notes": "",
      "production_notes": "",
      "variation_notes": "",
      "why_this_works": "",
      "production_risks": "",
      "refinement_recommendations": "",
      "one_color_version_notes": "",
      "social_media_version_notes": "",
      "print_apparel_signage_notes": "",
      "diamond_score": {
        "brand_strategy_fit": 0,
        "visual_balance": 0,
        "typography_quality": 0,
        "shape_strength": 0,
        "color_strength": 0,
        "vector_readiness": 0,
        "one_color_strength": 0,
        "embroidery_readiness": 0,
        "signage_readiness": 0,
        "social_media_readiness": 0,
        "apparel_readiness": 0,
        "professional_polish": 0,
        "overall": 0
      }
    }
  ],
  "best_overall_rendering": "",
  "best_production_ready_rendering": "",
  "best_social_media_rendering": "",
  "best_apparel_embroidery_rendering": "",
  "ab_designer_warning": ""
}

SVG rules:
- Use valid inline SVG markup
- Use viewBox="0 0 1200 800"
- Use solid fills only
- Use clean path, rect, circle, polygon, line, and text elements
- Use readable text elements for the business name
- Use simple symbolic elements when appropriate
- Do not use external images
- Do not use gradients
- Do not use filters
- Do not use shadows
- Do not use glow effects
- Do not use raster images
- Do not use tiny decorative details
- Do not use script
- Do not use foreignObject
- Do not use embedded photos
- Keep the artwork scalable, clean, and production-friendly

Every rendering must include a professional explanation of why it has value.
Every rendering must explain how it supports:
- Client trust
- Brand recognition
- Professional appearance
- Print production
- Apparel
- Signage
- Social media
- Business growth

End with:
- Best Overall Rendering
- Best Production-Ready Rendering
- Best Social Media Rendering
- Best Apparel / Embroidery Rendering
- AB Designer Warning
`;

export const AB_DIAMOND_LOGO_PROMPT_TOKENS = [
  "business_name",
  "client_name",
  "industry",
  "business_description",
  "main_products_services",
  "business_stage",
  "target_customer",
  "customer_pain_points",
  "problem_solved",
  "business_differentiator",
  "client_original_ideas",
  "client_brand_vision",
  "client_inspiration_notes",
  "client_must_have_elements",
  "client_nice_to_have_elements",
  "client_emotional_goal",
  "future_brand_vision",
  "colors_to_avoid",
  "fonts_to_avoid",
  "symbols_to_avoid",
  "shapes_to_avoid",
  "styles_to_avoid",
  "other_avoidance_notes",
  "brand_goals",
  "brand_personality",
  "brand_feeling",
  "words_to_describe_brand",
  "words_not_to_describe_brand",
  "logo_type_preferences",
  "shape_preferences",
  "orientation_preferences",
  "font_style_preferences",
  "mascot_symbol_ideas",
  "industry_symbols_to_consider",
  "initials_abbreviation",
  "tagline_ideas",
  "digital_usage",
  "print_usage",
  "primary_color_name",
  "primary_hex",
  "primary_pantone",
  "secondary_color_name",
  "secondary_hex",
  "secondary_pantone",
  "accent_color_name",
  "accent_hex",
  "accent_pantone",
  "neutral_color_name",
  "neutral_hex",
  "neutral_pantone",
  "color_mood",
  "logo_version_needs",
  "required_file_formats",
  "vector_preparation_notes",
  "ab_creative_direction_notes",
  "ab_professional_recommendation",
] as const;

export type AbDiamondLogoPromptToken = (typeof AB_DIAMOND_LOGO_PROMPT_TOKENS)[number];
export type AbDiamondLogoPromptValues = Partial<Record<AbDiamondLogoPromptToken, unknown>>;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "Not specified";
  if (Array.isArray(value)) {
    const joined = value
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
      .join(", ");
    return joined || "Not specified";
  }
  const s = String(value).trim();
  return s || "Not specified";
}

/** Substitute brand profile values into the template. Unknown tokens become "Not specified". */
export function buildAbDiamondLogoPrompt(values: AbDiamondLogoPromptValues = {}): string {
  const v = values as Record<string, unknown>;
  return AB_DIAMOND_LOGO_PROMPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_m, token: string) =>
    formatValue(v[token]),
  );
}

export const abDiamondLogoPrompt = {
  id: AB_DIAMOND_LOGO_PROMPT_ID,
  name: AB_DIAMOND_LOGO_PROMPT_NAME,
  systemMessage: AB_DIAMOND_LOGO_SYSTEM_MESSAGE,
  template: AB_DIAMOND_LOGO_PROMPT_TEMPLATE,
  tokens: AB_DIAMOND_LOGO_PROMPT_TOKENS,
  build: buildAbDiamondLogoPrompt,
} as const;
