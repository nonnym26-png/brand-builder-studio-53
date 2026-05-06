/**
 * AB Design DNA Prompt
 *
 * Internal prompt used to generate a Design DNA from a Brand Profile.
 * Server-only — never import from client code.
 */

export const AB_DESIGN_DNA_PROMPT_TEMPLATE = `You are the senior brand identity strategist for Anaglyph Branding.

Before generating any logo rendering, analyze the completed Brand Profile and create a professional Design DNA direction.

The Design DNA must guide the logo system so the result feels custom, polished, premium, and production-ready.

Use the Brand Profile:

Business Name:
{{business_name}}

Industry:
{{industry}}

Brand Goals:
{{brand_goals}}

Brand Personality:
{{brand_personality}}

Client Vision:
{{client_brand_vision}}

Client Ideas:
{{client_original_ideas}}

What Client Wants to Avoid:
{{other_avoidance_notes}}

Preferred Colors:
{{primary_color_name}} {{primary_hex}}
{{secondary_color_name}} {{secondary_hex}}
{{accent_color_name}} {{accent_hex}}
{{neutral_color_name}} {{neutral_hex}}

Font Preferences:
{{font_style_preferences}}

Shape Preferences:
{{shape_preferences}}

Logo Usage:
{{digital_usage}}
{{print_usage}}

Vector Preparation Notes:
{{vector_preparation_notes}}

Create a Design DNA profile with all 20 sections (design_style, brand_personality_summary, visual_tone, typography_direction, primary_font_style, secondary_font_style, letter_spacing_style, monogram_direction, symbol_direction, shape_language, line_style, color_hierarchy, accent_color_usage, layout_system, composition_notes, premium_design_rules, production_rules, social_media_rules, logo_variation_rules, avoidance_rules).

Voice: confident, agency-grade, specific. No fluff. Return ONLY through the provided tool.`;

const FIELDS = [
  "business_name",
  "industry",
  "brand_goals",
  "brand_personality",
  "client_brand_vision",
  "client_original_ideas",
  "other_avoidance_notes",
  "primary_color_name",
  "primary_hex",
  "secondary_color_name",
  "secondary_hex",
  "accent_color_name",
  "accent_hex",
  "neutral_color_name",
  "neutral_hex",
  "font_style_preferences",
  "shape_preferences",
  "digital_usage",
  "print_usage",
  "vector_preparation_notes",
] as const;

function fmt(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

export function fillAbDesignDnaPrompt(profile: Record<string, unknown>): string {
  let out = AB_DESIGN_DNA_PROMPT_TEMPLATE;
  for (const key of FIELDS) {
    out = out.replaceAll(`{{${key}}}`, fmt(profile[key]));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Tool schema — drives JSON-only structured output from the model.    */
/* Keys MUST match the design_dna table columns.                       */
/* ------------------------------------------------------------------ */

const STRING = (description: string) => ({ type: "string", description });

export const AB_DESIGN_DNA_TOOL = {
  type: "function" as const,
  function: {
    name: "return_design_dna",
    description: "Return the structured Design DNA for this brand.",
    parameters: {
      type: "object",
      properties: {
        design_style: STRING("e.g. Premium consulting, modern corporate, luxury professional."),
        brand_personality_summary: STRING("One polished paragraph describing the personality."),
        visual_tone: STRING("Confident, elegant, established, refined, etc."),
        typography_direction: STRING("Overall type style direction."),
        primary_font_style: STRING("Main logo font style."),
        secondary_font_style: STRING("Descriptor font style (CONSULTING, GROUP, etc)."),
        letter_spacing_style: STRING("tight, normal, wide, or luxury."),
        monogram_direction: STRING("Refined initial mark, badge initials, or none."),
        symbol_direction: STRING("Visual symbol approach."),
        shape_language: STRING("Shape system: angles, curves, badge, shield, etc."),
        line_style: STRING("thin, medium, bold, elegant, angular, minimal."),
        color_hierarchy: STRING("Roles for primary, secondary, accent, neutral."),
        accent_color_usage: STRING("How accent color is used (underline, dot, swoosh...)."),
        layout_system: STRING("Preferred lockup: emblem, icon-left, stacked, etc."),
        composition_notes: STRING("Spacing, alignment, balance, hierarchy notes."),
        premium_design_rules: STRING("Rules that keep the design from looking cheap."),
        production_rules: STRING("Vector, print, apparel, signage, embroidery, social."),
        social_media_rules: STRING("How it simplifies for profile icons and small use."),
        logo_variation_rules: STRING("Recommended variations: full, icon, wordmark, mono, etc."),
        avoidance_rules: STRING("What designer or AI must avoid."),
      },
      required: [
        "design_style",
        "brand_personality_summary",
        "visual_tone",
        "typography_direction",
        "primary_font_style",
        "secondary_font_style",
        "letter_spacing_style",
        "monogram_direction",
        "symbol_direction",
        "shape_language",
        "line_style",
        "color_hierarchy",
        "accent_color_usage",
        "layout_system",
        "composition_notes",
        "premium_design_rules",
        "production_rules",
        "social_media_rules",
        "logo_variation_rules",
        "avoidance_rules",
      ],
      additionalProperties: false,
    },
  },
};

export type AbDesignDnaResult = Record<
  (typeof AB_DESIGN_DNA_TOOL.function.parameters.required)[number],
  string
>;

export async function runAbDesignDnaPrompt(
  profile: Record<string, unknown>,
): Promise<AbDesignDnaResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway is not configured.");

  const userPrompt = fillAbDesignDnaPrompt(profile);

  const body = {
    model: "google/gemini-2.5-pro",
    messages: [
      {
        role: "system",
        content:
          "You are the senior brand identity strategist for Anaglyph Branding. Always respond by calling the return_design_dna tool. Never include prose outside the tool call.",
      },
      { role: "user", content: userPrompt },
    ],
    tools: [AB_DESIGN_DNA_TOOL],
    tool_choice: { type: "function", function: { name: AB_DESIGN_DNA_TOOL.function.name } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    const txt = await resp.text().catch(() => "");
    throw new Error(`AI gateway error (${resp.status}) ${txt.slice(0, 200)}`);
  }

  const json = await resp.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no Design DNA.");
  return JSON.parse(args) as AbDesignDnaResult;
}