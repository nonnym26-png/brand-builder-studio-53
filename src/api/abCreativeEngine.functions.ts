import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runLogoPipeline } from "@/lib/logo-engine/logoPipeline";
import { classifyRevision } from "@/lib/logo-engine/revisionEngine";
import type { OutputMode, DesignDnaStrategy, LogoMarkType } from "@/lib/logo-engine/types";

function backgroundChoiceToMode(bg?: string): OutputMode {
  switch ((bg || "").toLowerCase()) {
    case "transparent":
      return "transparent_production";
    case "dark":
      return "dark_background_preview";
    case "one-color":
    case "one_color":
      return "one_color_test";
    default:
      return "presentation_preview";
  }
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "openai/gpt-5";
const IMAGE_MODEL = "google/gemini-3-pro-image-preview";

const QUALITY_RULES = `DESIGN QUALITY RULES (must obey):
- Professional, agency-grade — never generic or clipart.
- Clean, readable, limited color palette, strong contrast.
- Real-world production ready (shirts, signs, decals, business cards, web).
- No mockup background unless explicitly requested.
- No blurry text, no misspelled words, no distorted letters, no random clutter.
- Spell every word EXACTLY as provided.
- Always include layout, typography, color, and negative direction.`;

const REVISION_INTENT_MAP: Record<string, string> = {
  "more professional": "Simplify the design, refine typography, reduce gimmicks, tighten spacing, increase whitespace, make it feel more premium and grown-up. Keep the icon idea, just elevate execution.",
  "more bold": "Increase contrast, thicken outlines and strokes, strengthen the typographic weight, make the icon structure more visually dominant.",
  "less cartoon": "Reduce mascot exaggeration, simplify shapes, move closer to flat brand-mark illustration. Keep the character recognizable but more refined.",
  "more mascot": "Increase character personality and expression while keeping the design clean and professional. Mascot becomes the hero.",
  "transparent background": "Render on a fully transparent background. No frame, no plate, just the artwork.",
  "high res": "Optimize for print quality — crisp edges, vector-like clarity.",
};

function detectIntents(text: string): string[] {
  const lc = text.toLowerCase();
  return Object.entries(REVISION_INTENT_MAP)
    .filter(([k]) => lc.includes(k))
    .map(([, v]) => v);
}

async function callGatewayJson(messages: unknown[], tool: { name: string; schema: object }) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      tools: [{ type: "function", function: { name: tool.name, description: "Return structured output", parameters: tool.schema } }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    throw new Error(`AI gateway error ${res.status}`);
  }
  const json = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no structured output");
  return JSON.parse(args);
}

async function callGatewayImage(prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    throw new Error(`Image gateway error ${res.status}`);
  }
  const json = await res.json();
  const dataUrl = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
  if (!dataUrl) throw new Error("AI returned no image");
  return dataUrl;
}

async function uploadDataUrl(dataUrl: string, brandProfileId: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) throw new Error("Bad data url");
  const ext = m[1].split("/")[1];
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const path = `${brandProfileId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseAdmin.storage.from("ab-designs").upload(path, bytes, {
    contentType: m[1],
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabaseAdmin.storage.from("ab-designs").getPublicUrl(path);
  return data.publicUrl;
}

function summarizeProfile(p: Record<string, unknown>) {
  const arr = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[]).join(", ") : "");
  const str = (k: string) => (p[k] as string) || "";
  return {
    business_name: str("business_name"),
    industry: str("industry"),
    services: str("main_products_services") || str("business_description"),
    target_customer: str("target_customer"),
    differentiator: str("business_differentiator"),
    personality: arr("brand_personality"),
    feeling: str("brand_feeling") || str("client_emotional_goal"),
    location: str("business_location_service_area"),
    competitors: str("competitors"),
    preferred_colors: [str("primary_color_name"), str("secondary_color_name"), str("accent_color_name")].filter(Boolean).join(", "),
    primary_hex: str("primary_hex"),
    accent_hex: str("accent_hex"),
    neutral_hex: str("neutral_hex"),
    colors_to_avoid: str("colors_to_avoid"),
    mascot_ideas: str("mascot_symbol_ideas"),
    logo_type_preferences: arr("logo_type_preferences"),
    font_style_preferences: arr("font_style_preferences"),
    color_mood: arr("color_mood"),
    digital_usage: arr("digital_usage"),
    print_usage: arr("print_usage"),
    inspiration: str("client_inspiration_notes"),
    must_have: str("client_must_have_elements"),
    nice_to_have: str("client_nice_to_have_elements"),
    avoid: [str("symbols_to_avoid"), str("shapes_to_avoid"), str("styles_to_avoid"), str("fonts_to_avoid"), arr("avoidance_checklist")].filter(Boolean).join(" | "),
    tagline: str("tagline_ideas"),
    vision: str("client_brand_vision"),
  };
}

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    concept: { type: "string", description: "One-paragraph creative concept and big idea" },
    audience_lens: { type: "string" },
    mood: { type: "string" },
    mark_type: { type: "string", enum: ["wordmark", "lettermark", "monogram", "emblem", "combination", "abstract", "mascot", "badge"] },
    palette: { type: "object", properties: { primary: { type: "string" }, accent: { type: "string" }, neutral: { type: "string" }, notes: { type: "string" } }, required: ["primary", "accent", "neutral"] },
    typography: { type: "string" },
    layout: { type: "string" },
    usage_targets: { type: "array", items: { type: "string" } },
    do_not_list: { type: "array", items: { type: "string" } },
  },
  required: ["concept", "mood", "mark_type", "palette", "typography", "layout"],
  additionalProperties: false,
};

const PROMPT_SCHEMA = {
  type: "object",
  properties: {
    final_prompt: { type: "string", description: "Highly detailed image-generation prompt ready to send to an image model" },
    negative_prompt: { type: "string" },
    design_type: { type: "string" },
  },
  required: ["final_prompt", "negative_prompt", "design_type"],
  additionalProperties: false,
};

export const generateAbDesign = createServerFn({ method: "POST" })
  .inputValidator((d: {
    brandProfileId: string;
    backgroundChoice?: string;
    outputCount?: number;
    forceMarkTypes?: LogoMarkType[];
    designDna?: { mustHave?: string; avoid?: string; qualityBar?: string; formula?: string };
    extras?: {
      fonts?: { heading?: string; body?: string; accent?: string };
      chosenSlogan?: string | null;
      elements?: string[];
      mascot?: { enabled?: boolean; style?: string; idea?: string };
    };
  }) => d)
  .handler(async ({ data }) => {
    // NEW PIPELINE — delegates to src/lib/logo-engine.
    // Old per-call brief/prompt/image steps are replaced by runLogoPipeline,
    // which: builds DNA strategy → compiles prompt → renders premium image →
    // runs the quality gatekeeper → regenerates failed concepts up to 2× →
    // persists each concept to generated_designs (with quality fields).
    const result = await runLogoPipeline({
      brandProfileId: data.brandProfileId,
      outputCount: data.outputCount ?? 1,
      outputMode: backgroundChoiceToMode(data.backgroundChoice),
      forceMarkTypes: data.forceMarkTypes,
    });

    // Maintain the legacy { design, brief } return shape so the existing
    // Phase-2 UI keeps working. We hand back the FIRST persisted row (the
    // primary concept) plus the brief stub the pipeline wrote.
    const primary = (result.designRows[0] || {}) as Record<string, unknown>;
    const briefId = typeof primary.creative_brief_id === "string" ? primary.creative_brief_id : null;
    const briefRow = briefId
      ? (
          await supabaseAdmin
            .from("creative_briefs")
            .select("*")
            .eq("id", briefId)
            .maybeSingle()
        ).data
      : null;
    return {
      design: JSON.parse(JSON.stringify(primary)) as Record<string, string | number | boolean | null>,
      brief: briefRow,
      conceptGroupId: result.conceptGroupId,
    };
  });

export const reviseAbDesign = createServerFn({ method: "POST" })
  .inputValidator((d: { generatedDesignId: string; userRequest: string }) => d)
  .handler(async ({ data }) => {
    // NEW PIPELINE — delegates to revisionEngine + runLogoPipeline.
    const { data: parent, error } = await supabaseAdmin
      .from("generated_designs")
      .select("*")
      .eq("id", data.generatedDesignId)
      .single();
    if (error || !parent) throw new Error("Design not found");
    const parentRow = parent as unknown as Record<string, unknown>;

    const lockedDna = (parentRow.design_dna_snapshot as DesignDnaStrategy | null) || undefined;
    if (!lockedDna) {
      // No DNA snapshot exists on legacy rows → run a fresh pipeline.
      const fresh = await runLogoPipeline({
        brandProfileId: parentRow.brand_profile_id as string,
        outputCount: 1,
      });
      const primary = fresh.designRows[0] as Record<string, unknown>;
      await supabaseAdmin.from("revision_requests").insert({
        brand_profile_id: parentRow.brand_profile_id as string,
        generated_design_id: data.generatedDesignId,
        user_request: data.userRequest,
        revised_prompt: (primary.prompt_used as string) ?? "",
        revised_image_url: primary.image_url as string,
        new_design_id: primary.id as string,
      });
      return { design: JSON.parse(JSON.stringify(primary)) as Record<string, string | number | boolean | null>, brief: null };
    }

    const classified = classifyRevision({
      userRequest: data.userRequest,
      parentDna: lockedDna,
      parentPrompt: (parentRow.prompt_used as string) ?? "",
      parentConceptId: parentRow.id as string,
    });

    const result = await runLogoPipeline({
      brandProfileId: parentRow.brand_profile_id as string,
      outputCount: 1,
      outputMode: classified.outputModeOverride ?? (parentRow.output_mode as OutputMode) ?? "presentation_preview",
      // Full-redesign means rebuild DNA; otherwise lock the previous DNA.
      lockedDna: classified.isFullRedesign ? undefined : lockedDna,
      revisionContext: classified.context,
    });
    const primary = result.designRows[0] as Record<string, unknown>;

    await supabaseAdmin.from("revision_requests").insert({
      brand_profile_id: parentRow.brand_profile_id as string,
      generated_design_id: data.generatedDesignId,
      user_request: data.userRequest,
      revised_prompt: (primary.prompt_used as string) ?? "",
      revised_image_url: primary.image_url as string,
      new_design_id: primary.id as string,
    });

    return { design: JSON.parse(JSON.stringify(primary)) as Record<string, string | number | boolean | null>, brief: null };
  });

export const listAbDesigns = createServerFn({ method: "GET" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("generated_designs")
      .select("*, creative_briefs(brief_json, final_prompt, negative_prompt)")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { designs: rows || [] };
  });

export const approveAbDesign = createServerFn({ method: "POST" })
  .inputValidator((d: { generatedDesignId: string; approved: boolean }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("generated_designs")
      .update({ is_approved: data.approved })
      .eq("id", data.generatedDesignId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });