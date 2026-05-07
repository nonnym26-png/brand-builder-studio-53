/**
 * Design DNA — STRATEGY layer.
 *
 * Generates a structured `DesignDnaStrategy` JSON object from a brand profile.
 * It does NOT produce visual output. Downstream stages (prompt compiler,
 * image generator, quality filter, revision engine) all consume this object.
 *
 * If a previously approved DNA is supplied (revision case), we return it
 * unchanged so the locked direction is preserved.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  BrandProfileSummary,
  DesignDnaStrategy,
  LogoMarkType,
} from "./types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const STRATEGY_MODEL = "openai/gpt-5";

const DNA_SCHEMA = {
  type: "object",
  properties: {
    targetAudience: { type: "string" },
    desiredImpression: { type: "string" },
    brandPersonality: { type: "array", items: { type: "string" } },
    logoType: {
      type: "string",
      enum: ["wordmark", "lettermark", "monogram", "emblem", "combination", "abstract", "mascot", "badge"],
    },
    shapeDirection: { type: "string" },
    typographyDirection: { type: "string" },
    colorPalette: {
      type: "object",
      properties: {
        primary: { type: "string" },
        accent: { type: "string" },
        neutral: { type: "string" },
        notes: { type: "string" },
      },
      required: ["primary", "accent", "neutral"],
      additionalProperties: false,
    },
    iconIdeas: { type: "array", items: { type: "string" } },
    symbolsToAvoid: { type: "array", items: { type: "string" } },
    productionUseCases: { type: "array", items: { type: "string" } },
    strategicRationale: { type: "string" },
    differentiationNotes: { type: "string" },
    mustPreserve: { type: "array", items: { type: "string" } },
    mustAvoid: { type: "array", items: { type: "string" } },
  },
  required: [
    "targetAudience",
    "desiredImpression",
    "brandPersonality",
    "logoType",
    "shapeDirection",
    "typographyDirection",
    "colorPalette",
    "iconIdeas",
    "symbolsToAvoid",
    "productionUseCases",
    "strategicRationale",
    "differentiationNotes",
    "mustPreserve",
    "mustAvoid",
  ],
  additionalProperties: false,
} as const;

function fallbackDna(p: BrandProfileSummary): DesignDnaStrategy {
  const logoType: LogoMarkType =
    (p.logoTypePreferences[0]?.toLowerCase() as LogoMarkType) || "combination";
  return {
    businessName: p.businessName,
    exactLogoText: p.exactLogoText,
    industry: p.industry,
    targetAudience: p.targetCustomer,
    desiredImpression: p.feeling || "trustworthy, established, professional",
    brandPersonality: p.personality,
    logoType,
    shapeDirection: p.shapePreferences.join(", ") || "balanced geometric forms",
    typographyDirection: p.fontStylePreferences.join(", ") || "confident contemporary sans-serif",
    colorPalette: {
      primary: p.primaryHex || "#0F0F10",
      accent: p.accentHex || "#B81F2A",
      neutral: p.neutralHex || "#3A3A3A",
      notes: p.preferredColors,
    },
    iconIdeas: [p.mascotIdeas].filter(Boolean),
    symbolsToAvoid: [p.symbolsToAvoid, p.shapesToAvoid].filter(Boolean),
    productionUseCases: [...p.digitalUsage, ...p.printUsage],
    strategicRationale: p.differentiator || p.vision || "",
    differentiationNotes: p.differentiator,
    mustPreserve: [p.businessName].filter(Boolean),
    mustAvoid: [p.colorsToAvoid, p.stylesToAvoid, p.fontsToAvoid, ...p.avoidanceChecklist].filter(Boolean),
  };
}

export async function buildDesignDnaStrategy(
  profile: BrandProfileSummary,
  options?: { lockedDna?: DesignDnaStrategy },
): Promise<DesignDnaStrategy> {
  if (options?.lockedDna) return options.lockedDna;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    // Graceful fallback so the pipeline still produces strategy
    return fallbackDna(profile);
  }

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: STRATEGY_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are the senior brand strategist at Anaglyph Branding. Produce STRATEGY ONLY — never describe a finished logo. Always respond by calling the return_design_dna tool. The DNA you return must enable a designer/AI to generate a logo that fits the business strategy, looks established and trustworthy, and works on apparel/signage/business cards/social media.",
          },
          {
            role: "user",
            content: `Build the Design DNA strategy for this brand:\n${JSON.stringify(profile, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_design_dna",
              description: "Return the strategic Design DNA.",
              parameters: DNA_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_design_dna" } },
      }),
    });
    if (!res.ok) return fallbackDna(profile);
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return fallbackDna(profile);
    const partial = JSON.parse(args) as Omit<
      DesignDnaStrategy,
      "businessName" | "exactLogoText" | "industry"
    >;
    return {
      businessName: profile.businessName,
      exactLogoText: profile.exactLogoText,
      industry: profile.industry,
      ...partial,
    };
  } catch {
    return fallbackDna(profile);
  }
}

/**
 * Persist the strategic DNA back into the saved `design_dna` table so the
 * existing UI (which reads that table) stays in sync.
 */
export async function persistDesignDnaStrategy(
  brandProfileId: string,
  dna: DesignDnaStrategy,
) {
  const patch = {
    design_style: `${dna.logoType} — ${dna.differentiationNotes || dna.desiredImpression}`.slice(0, 4000),
    brand_personality_summary: dna.brandPersonality.join(", "),
    visual_tone: dna.desiredImpression,
    typography_direction: dna.typographyDirection,
    shape_language: dna.shapeDirection,
    color_hierarchy: `${dna.colorPalette.primary} primary · ${dna.colorPalette.accent} accent · ${dna.colorPalette.neutral} neutral`,
    accent_color_usage: dna.colorPalette.notes || "restrained, intentional",
    avoidance_rules: dna.mustAvoid.join("; "),
    designer_notes: dna.strategicRationale,
  };
  const { data: existing } = await supabaseAdmin
    .from("design_dna")
    .select("id")
    .eq("brand_profile_id", brandProfileId)
    .maybeSingle();
  if (existing?.id) {
    await supabaseAdmin.from("design_dna").update(patch as never).eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("design_dna")
      .insert({ brand_profile_id: brandProfileId, ...patch } as never);
  }
}