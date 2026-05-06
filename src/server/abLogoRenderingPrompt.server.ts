/**
 * AB Logo Rendering Prompt
 *
 * Internal prompt used to generate SVG logo renderings AFTER a Design DNA
 * has been saved for the brand profile. The Design DNA is the creative
 * direction — every rendering MUST follow it.
 *
 * Server-only — never import from client code.
 */

import { getAdminClient } from "./phase2.server";

const PREMIUM_LOGO_FORMULA_PROMPT = `PREMIUM LOGO FORMULA — every rendering MUST satisfy all 10 rules:
1. A strong primary mark — monogram, symbol, badge, or refined wordmark.
2. A readable wordmark — business name clear, balanced, confident at any size.
3. A secondary descriptor — if applicable use CONSULTING, SERVICES, STUDIO, GROUP with controlled letter spacing.
4. A restrained accent — accent color used sparingly: dot, underline, swoosh, separator, or monogram detail.
5. Strong spacing — the logo must breathe. Avoid crowding.
6. Clear hierarchy — the viewer must know what to read first.
7. Scalable geometry — works from favicon to billboard.
8. Simple color system — 1 to 3 solid colors maximum.
9. No cheap effects — no gradients, shadows, bevels, glows, photos, or busy backgrounds.
10. Variation-ready — supports icon-only, wordmark, stacked, horizontal, black, white, and one-color versions.`;

export const AB_LOGO_RENDERING_PROMPT_TEMPLATE = `You are the senior brand identity designer at Anaglyph Branding.

Before generating the SVG logo renderings, use the saved Design DNA.

The Design DNA is the creative direction that controls the logo quality.

Design DNA:
{{design_dna}}

Brand Profile (reference only — do NOT override the Design DNA):
{{brand_profile}}

All logo renderings must follow this Design DNA.

Do not ignore typography direction.
Do not ignore spacing rules.
Do not ignore color hierarchy.
Do not ignore accent color usage.
Do not ignore production rules.
Do not create generic template layouts.

The logo should feel like a professional brand identity presentation, not a cheap logo builder result.

${PREMIUM_LOGO_FORMULA_PROMPT}

SVG technical rules (mandatory):
- viewBox="0 0 1200 800"
- solid fills only — no gradients, filters, shadows, raster images, scripts, foreignObject, or external references
- clean vector geometry, generous optical spacing, balanced composition
- text must use system-safe families (e.g. "Inter, Helvetica, Arial, sans-serif" or "Georgia, 'Times New Roman', serif") chosen to honor the typography_direction
- accent color used exactly as the Design DNA's accent_color_usage prescribes
- one_color version note must describe how the design collapses to a single ink

Return 6 distinct, agency-grade renderings via the provided tool.`;

export const AB_LOGO_RENDERING_TOOL = {
  type: "function" as const,
  function: {
    name: "return_logo_renderings",
    description: "Return 6 SVG logo renderings, all faithful to the Design DNA.",
    parameters: {
      type: "object",
      properties: {
        renderings: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              concept_name: { type: "string" },
              concept_type: {
                type: "string",
                description:
                  "wordmark | combination | monogram | emblem | abstract | mascot",
              },
              layout_style: { type: "string" },
              shape_system: { type: "string" },
              typography_system: { type: "string" },
              symbol_system: { type: "string" },
              color_system: {
                type: "object",
                properties: {
                  primary: { type: "string" },
                  secondary: { type: "string" },
                  accent: { type: "string" },
                  neutral: { type: "string" },
                },
                required: ["primary", "accent", "neutral"],
                additionalProperties: false,
              },
              svg_markup: {
                type: "string",
                description:
                  "Complete <svg viewBox=\"0 0 1200 800\">…</svg> markup. Solid fills only. No scripts, gradients, filters, shadows, foreignObject, raster images, or external refs.",
              },
              strategic_value_statement: { type: "string" },
              production_value_statement: { type: "string" },
              why_not_generic: { type: "string" },
              one_color_version_notes: { type: "string" },
              social_media_version_notes: { type: "string" },
              print_apparel_signage_notes: { type: "string" },
            },
            required: [
              "concept_name",
              "concept_type",
              "layout_style",
              "shape_system",
              "typography_system",
              "symbol_system",
              "color_system",
              "svg_markup",
              "strategic_value_statement",
              "production_value_statement",
              "why_not_generic",
              "one_color_version_notes",
              "social_media_version_notes",
              "print_apparel_signage_notes",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["renderings"],
      additionalProperties: false,
    },
  },
};

export type AbLogoRendering = {
  concept_name: string;
  concept_type: string;
  layout_style: string;
  shape_system: string;
  typography_system: string;
  symbol_system: string;
  color_system: { primary?: string; secondary?: string; accent?: string; neutral?: string };
  svg_markup: string;
  strategic_value_statement: string;
  production_value_statement: string;
  why_not_generic: string;
  one_color_version_notes: string;
  social_media_version_notes: string;
  print_apparel_signage_notes: string;
};

const FORBIDDEN_SVG = /<\s*(script|foreignObject|iframe|object|embed|image)\b/gi;
function sanitizeSvg(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(FORBIDDEN_SVG, "<g data-stripped")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

export function buildLogoRenderingPrompt(args: {
  designDna: Record<string, unknown>;
  brandProfile: Record<string, unknown>;
}): string {
  const dnaSlim = JSON.stringify(args.designDna, null, 2);
  // Trim brand profile to fields relevant to the renderer
  const profile = args.brandProfile;
  const slim: Record<string, unknown> = {};
  for (const k of [
    "business_name",
    "industry",
    "initials_abbreviation",
    "tagline_ideas",
    "include_tagline",
    "primary_color_name",
    "primary_hex",
    "secondary_color_name",
    "secondary_hex",
    "accent_color_name",
    "accent_hex",
    "neutral_color_name",
    "neutral_hex",
    "vector_preparation_notes",
  ]) {
    if (profile[k] != null) slim[k] = profile[k];
  }
  return AB_LOGO_RENDERING_PROMPT_TEMPLATE.replaceAll("{{design_dna}}", dnaSlim).replaceAll(
    "{{brand_profile}}",
    JSON.stringify(slim, null, 2),
  );
}

/** Run the rendering prompt for a brand profile and return sanitized SVG renderings. */
export async function runAbLogoRenderingPrompt(
  brandProfileId: string,
): Promise<AbLogoRendering[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway is not configured.");

  const sb = getAdminClient();
  const { data: profile, error: pErr } = await sb
    .from("brand_profiles")
    .select("*")
    .eq("id", brandProfileId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile) throw new Error("Brand Profile not found");

  const { data: dnaRow, error: dErr } = await sb
    .from("design_dna")
    .select("*")
    .eq("brand_profile_id", brandProfileId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dErr) throw new Error(dErr.message);
  if (!dnaRow)
    throw new Error(
      "No Design DNA found for this brand profile. Generate the Design DNA first.",
    );

  const userPrompt = buildLogoRenderingPrompt({
    designDna: dnaRow as Record<string, unknown>,
    brandProfile: profile as Record<string, unknown>,
  });

  const body = {
    model: "openai/gpt-5",
    messages: [
      {
        role: "system",
        content:
          "You are the Creative Director at Anaglyph Branding, a top-tier identity studio (think Pentagram, Collins, Chermayeff & Geismar). Every rendering must look like paid agency work — never a logo-builder template. The Design DNA is law. Compose original, considered SVG marks with refined geometry, sophisticated typography pairings, deliberate negative space, and restrained accent usage. No clip-art, no stock symbols, no generic circles-with-initials, no rainbow palettes, no centered-blob layouts. Always respond by calling the return_logo_renderings tool. Never include prose outside the tool call.",
      },
      { role: "user", content: userPrompt },
    ],
    tools: [AB_LOGO_RENDERING_TOOL],
    tool_choice: {
      type: "function",
      function: { name: AB_LOGO_RENDERING_TOOL.function.name },
    },
    reasoning: { effort: "high" },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (resp.status === 402)
      throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    const txt = await resp.text().catch(() => "");
    throw new Error(`AI gateway error (${resp.status}) ${txt.slice(0, 200)}`);
  }

  const json = await resp.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no logo renderings.");
  const parsed = JSON.parse(args) as { renderings: AbLogoRendering[] };

  return (parsed.renderings ?? []).map((r) => ({
    ...r,
    svg_markup: sanitizeSvg(r.svg_markup),
  }));
}