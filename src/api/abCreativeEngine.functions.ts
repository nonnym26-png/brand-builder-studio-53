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

function safeName(s: string): string {
  return (s || "asset").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
}

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const exportBrandKit = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { default: JSZip } = await import("jszip");

    const [{ data: profile, error: pErr }, { data: designs, error: dErr }, { data: dna }] = await Promise.all([
      supabaseAdmin.from("brand_profiles").select("*").eq("id", data.brandProfileId).single(),
      supabaseAdmin
        .from("generated_designs")
        .select("*, creative_briefs(brief_json, final_prompt, negative_prompt)")
        .eq("brand_profile_id", data.brandProfileId)
        .eq("is_approved", true)
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("design_dna").select("*").eq("brand_profile_id", data.brandProfileId).maybeSingle(),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (dErr) throw new Error(dErr.message);
    if (!profile) throw new Error("Brand profile not found");
    const approved = designs || [];
    if (approved.length === 0) throw new Error("No approved assets to export. Approve at least one design first.");

    const zip = new JSZip();
    const assetsFolder = zip.folder("assets")!;
    const manifest: Array<Record<string, unknown>> = [];

    for (let i = 0; i < approved.length; i++) {
      const d = approved[i] as Record<string, any>;
      try {
        const res = await fetch(d.image_url);
        if (!res.ok) continue;
        const buf = new Uint8Array(await res.arrayBuffer());
        const ext = (d.image_url.split(".").pop() || "png").split("?")[0];
        const filename = `${String(i + 1).padStart(2, "0")}_${safeName(d.design_type || "asset")}.${ext}`;
        assetsFolder.file(filename, buf);
        manifest.push({
          file: `assets/${filename}`,
          design_type: d.design_type,
          revision_number: d.revision_number,
          quality_score: d.quality_score,
          quality_decision: d.quality_decision,
          model_used: d.model_used,
          prompt: d.creative_briefs?.final_prompt || d.prompt_used || null,
          created_at: d.created_at,
        });
      } catch (e) {
        console.error("Failed to fetch asset", d.image_url, e);
      }
    }

    // Prompt history
    const promptHistory = approved
      .map((d: any, i: number) => `--- ${i + 1}. ${d.design_type || "Asset"} (rev ${d.revision_number || 0}) ---\n${d.creative_briefs?.final_prompt || d.prompt_used || "(no prompt recorded)"}\n`)
      .join("\n");
    zip.file("prompt-history.txt", promptHistory);

    // Design DNA snapshot
    zip.file("design-dna.json", JSON.stringify(dna || profile.design_dna || {}, null, 2));

    // Manifest
    zip.file("manifest.json", JSON.stringify({ business: profile.business_name, generated_at: new Date().toISOString(), assets: manifest }, null, 2));

    // Brand Kit Summary HTML
    const palette = [
      { name: profile.primary_color_name || "Primary", hex: profile.primary_hex },
      { name: profile.secondary_color_name || "Secondary", hex: profile.secondary_hex },
      { name: profile.accent_color_name || "Accent", hex: profile.accent_hex },
      { name: profile.neutral_color_name || "Neutral", hex: profile.neutral_hex },
    ].filter((c) => c.hex);
    const fonts = (profile as any).phase_2_fonts || {};
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Brand Kit — ${escapeHtml(profile.business_name)}</title>
<style>
:root{--bg:#fafafa;--fg:#0a0a0a;--muted:#6b7280;--card:#fff;--bd:#e5e7eb}
*{box-sizing:border-box}body{font:14px/1.55 -apple-system,Segoe UI,Inter,sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:40px}
.wrap{max-width:960px;margin:0 auto}
h1{font-size:34px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px;border-bottom:1px solid var(--bd);padding-bottom:6px}
.muted{color:var(--muted)}.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px}
.swatch{height:80px;border-radius:8px;border:1px solid var(--bd);margin-bottom:8px}
img{max-width:100%;height:180px;object-fit:contain;background:#f3f4f6;border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:8px;border-bottom:1px solid var(--bd)}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:600}
</style></head><body><div class="wrap">
<header><div class="muted">Brand Kit</div><h1>${escapeHtml(profile.business_name || "Untitled")}</h1>
<div class="muted">${escapeHtml(profile.industry || "")} · Generated ${new Date().toLocaleDateString()}</div></header>

<h2>Selected Logo Direction</h2>
<p>${escapeHtml(profile.phase_2_concept_notes || profile.ab_creative_direction_notes || profile.brand_profile_summary || "Approved Premium Refined direction.")}</p>

<h2>Color Palette</h2>
<div class="grid">${palette.map((c) => `<div class="card"><div class="swatch" style="background:${escapeHtml(c.hex)}"></div><div><strong>${escapeHtml(c.name)}</strong></div><div class="muted">${escapeHtml(c.hex)}</div></div>`).join("")}</div>

<h2>Typography</h2>
<div class="card"><div><strong>Heading:</strong> ${escapeHtml(fonts.heading || (dna as any)?.primary_font_style || "—")}</div>
<div><strong>Body:</strong> ${escapeHtml(fonts.body || (dna as any)?.secondary_font_style || "—")}</div>
<div><strong>Direction:</strong> ${escapeHtml((dna as any)?.typography_direction || "—")}</div></div>

<h2>Usage Notes</h2>
<div class="card">${escapeHtml(profile.digital_usage_notes || profile.print_production_notes || "Use approved palette and typography across all touchpoints. Maintain clear space around the mark equal to the cap-height of the wordmark.")}</div>

<h2>Production Notes</h2>
<div class="card">${escapeHtml(profile.print_production_notes || (dna as any)?.production_rules || "Logo is production-ready for shirts, signage, decals, embroidery, web, and social.")}</div>

<h2>Approved Assets (${approved.length})</h2>
<div class="grid">${approved.map((d: any, i: number) => `<div class="card"><img src="assets/${String(i + 1).padStart(2, "0")}_${safeName(d.design_type || "asset")}.${(d.image_url.split(".").pop() || "png").split("?")[0]}"/><div style="margin-top:8px"><strong>${escapeHtml(d.design_type || "Asset")}</strong> ${d.is_approved ? '<span class="badge">Approved</span>' : ""}</div><div class="muted">Revision ${d.revision_number || 0} · Quality ${d.quality_score ?? "—"}/10</div></div>`).join("")}</div>

<h2>Quality Report Summary</h2>
<table><thead><tr><th>Asset</th><th>Score</th><th>Decision</th><th>Model</th></tr></thead><tbody>
${approved.map((d: any) => `<tr><td>${escapeHtml(d.design_type || "—")}</td><td>${d.quality_score ?? "—"}</td><td>${escapeHtml(d.quality_decision || "—")}</td><td>${escapeHtml(d.model_used || "—")}</td></tr>`).join("")}
</tbody></table>

<h2>Revision History</h2>
<table><thead><tr><th>#</th><th>Asset</th><th>Revision</th><th>Created</th></tr></thead><tbody>
${approved.map((d: any, i: number) => `<tr><td>${i + 1}</td><td>${escapeHtml(d.design_type || "—")}</td><td>${d.revision_number || 0}</td><td>${new Date(d.created_at).toLocaleString()}</td></tr>`).join("")}
</tbody></table>

<footer style="margin-top:48px;color:var(--muted);font-size:12px">© ${new Date().getFullYear()} ${escapeHtml(profile.business_name || "")} · Brand Kit generated by AB Branding</footer>
</div></body></html>`;
    zip.file("Brand-Kit-Summary.html", html);

    const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    // base64 encode
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < blob.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(blob.subarray(i, i + chunk)));
    }
    const base64 = btoa(binary);
    const filename = `${safeName(profile.business_name || "brand")}-brand-kit.zip`;
    return { filename, base64, count: approved.length };
  });