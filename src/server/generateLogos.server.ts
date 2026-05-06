import { getAdminClient } from "./phase2.server";
import {
  AB_DIAMOND_LOGO_SYSTEM_MESSAGE,
  buildAbDiamondLogoPrompt,
  type AbDiamondLogoPromptValues,
} from "./prompts/abDiamondLogoRendering";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FORBIDDEN_SVG = /<\s*(script|foreignObject|iframe|object|embed|image)\b/gi;
const EVENT_HANDLERS = /\son\w+\s*=\s*"[^"]*"/gi;

function sanitizeSvg(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let svg = raw.trim();
  // strip code fences if any slipped through
  svg = svg.replace(/^```(?:svg|xml|html)?\s*/i, "").replace(/\s*```$/i, "");
  svg = svg.replace(FORBIDDEN_SVG, "<g data-stripped");
  svg = svg.replace(EVENT_HANDLERS, "");
  // strip external url() and external href references
  svg = svg.replace(/href\s*=\s*"https?:[^"]*"/gi, "");
  svg = svg.replace(/xlink:href\s*=\s*"https?:[^"]*"/gi, "");
  return svg;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    // try to find the first { ... } block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}

const ALLOWED_FIELDS = [
  "concept_name",
  "concept_type",
  "design_tier",
  "layout_style",
  "shape_system",
  "typography_system",
  "symbol_system",
  "color_system",
  "svg_markup",
  "strategic_value_statement",
  "production_value_statement",
  "brand_recognition_statement",
  "why_not_generic",
  "business_growth_value",
  "rendering_notes",
  "production_notes",
  "variation_notes",
  "why_this_works",
  "production_risks",
  "refinement_recommendations",
  "one_color_version_notes",
  "social_media_version_notes",
  "print_apparel_signage_notes",
  "diamond_score",
] as const;

function pickRendering(r: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in r) out[k] = r[k];
  }
  out.svg_markup = sanitizeSvg(r.svg_markup);
  out.design_tier = (r.design_tier as string) || "Agency-Level";
  out.status = "Generated";
  return out;
}

export async function generateLogoRenderingsForProfile(brandProfileId: string) {
  const sb = getAdminClient();
  const { data: profile, error: profileErr } = await sb
    .from("brand_profiles")
    .select("*")
    .eq("id", brandProfileId)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);
  if (!profile) throw new Error("Brand profile not found");

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  // Mark profile as in-progress
  await sb
    .from("brand_profiles")
    .update({ phase_2_rendering_status: "Generating" } as never)
    .eq("id", brandProfileId);

  const userPrompt = buildAbDiamondLogoPrompt(profile as AbDiamondLogoPromptValues);

  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: AB_DIAMOND_LOGO_SYSTEM_MESSAGE },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit exceeded — please try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted — add funds in Settings → Workspace → Usage.");
    throw new Error(`AI gateway error (${resp.status}): ${body.slice(0, 300)}`);
  }

  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("AI returned empty response");

  const parsed = extractJson(content) as {
    renderings?: Array<Record<string, unknown>>;
    best_overall_rendering?: string;
    ab_designer_warning?: string;
  };
  const renderings = Array.isArray(parsed.renderings) ? parsed.renderings : [];
  if (renderings.length === 0) throw new Error("AI returned no renderings");

  const rows = renderings.map((r) => ({
    brand_profile_id: brandProfileId,
    ...pickRendering(r),
  }));

  const { data: inserted, error: insertErr } = await sb
    .from("logo_renderings")
    .insert(rows as never)
    .select("*");
  if (insertErr) throw new Error(insertErr.message);

  await sb
    .from("brand_profiles")
    .update({
      phase_2_rendering_status: "Generated",
      diamond_recommendation_notes: parsed.ab_designer_warning ?? null,
    } as never)
    .eq("id", brandProfileId);

  return { count: inserted?.length ?? rows.length, renderings: inserted ?? [] };
}