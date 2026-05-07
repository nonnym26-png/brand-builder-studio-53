import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  .inputValidator((d: { brandProfileId: string; backgroundChoice?: string; outputCount?: number }) => d)
  .handler(async ({ data }) => {
    const { data: profile, error } = await supabaseAdmin.from("brand_profiles").select("*").eq("id", data.brandProfileId).single();
    if (error || !profile) throw new Error("Brand profile not found");
    const summary = summarizeProfile(profile as Record<string, unknown>);
    const background = data.backgroundChoice || "white";

    // Step A — creative brief
    const brief = await callGatewayJson(
      [
        { role: "system", content: `You are the Anaglyph Branding senior creative director. Produce a tight, agency-grade creative brief that a designer could execute from. ${QUALITY_RULES}` },
        { role: "user", content: `Build a creative brief for this brand. Background must be: ${background}. Intake JSON:\n${JSON.stringify(summary, null, 2)}` },
      ],
      { name: "creative_brief", schema: BRIEF_SCHEMA },
    );

    // Step B — image prompt
    const promptObj = await callGatewayJson(
      [
        { role: "system", content: `You are a master prompt engineer for premium logo image generation. Convert a creative brief into ONE highly detailed image prompt that will produce an agency-grade logo. ${QUALITY_RULES}\nAlways: include the EXACT business name "${summary.business_name}", explicit layout, explicit typography style, explicit colors (use hex when provided), explicit background, and a strong negative prompt. The output background MUST be: ${background}.` },
        { role: "user", content: `Brief:\n${JSON.stringify(brief, null, 2)}\n\nBrand colors hex (use these unless brief overrides): primary ${summary.primary_hex || "(none)"}, accent ${summary.accent_hex || "(none)"}, neutral ${summary.neutral_hex || "(none)"}.\n\nReturn the final_prompt, negative_prompt, and a short design_type label.` },
      ],
      { name: "image_prompt", schema: PROMPT_SCHEMA },
    );

    // Step C — render
    const fullPrompt = `${promptObj.final_prompt}\n\nNEGATIVE: ${promptObj.negative_prompt}`;
    const dataUrl = await callGatewayImage(fullPrompt);
    const publicUrl = await uploadDataUrl(dataUrl, data.brandProfileId);

    const { data: briefRow, error: briefErr } = await supabaseAdmin
      .from("creative_briefs")
      .insert({ brand_profile_id: data.brandProfileId, brief_json: brief, final_prompt: promptObj.final_prompt, negative_prompt: promptObj.negative_prompt })
      .select()
      .single();
    if (briefErr) throw new Error(briefErr.message);

    const { data: designRow, error: designErr } = await supabaseAdmin
      .from("generated_designs")
      .insert({
        brand_profile_id: data.brandProfileId,
        creative_brief_id: briefRow.id,
        image_url: publicUrl,
        prompt_used: fullPrompt,
        design_type: promptObj.design_type,
        revision_number: 0,
      })
      .select()
      .single();
    if (designErr) throw new Error(designErr.message);

    return { design: designRow, brief: briefRow };
  });

export const reviseAbDesign = createServerFn({ method: "POST" })
  .inputValidator((d: { generatedDesignId: string; userRequest: string }) => d)
  .handler(async ({ data }) => {
    if (/start over/i.test(data.userRequest)) {
      const { data: parent } = await supabaseAdmin.from("generated_designs").select("brand_profile_id").eq("id", data.generatedDesignId).single();
      if (!parent) throw new Error("Design not found");
      const fresh = await generateAbDesign({ data: { brandProfileId: parent.brand_profile_id } });
      await supabaseAdmin.from("revision_requests").insert({
        brand_profile_id: parent.brand_profile_id,
        generated_design_id: data.generatedDesignId,
        user_request: data.userRequest,
        revised_prompt: fresh.design.prompt_used,
        revised_image_url: fresh.design.image_url,
        new_design_id: fresh.design.id,
      });
      return fresh;
    }

    const { data: parent, error } = await supabaseAdmin
      .from("generated_designs")
      .select("*, creative_briefs(*)")
      .eq("id", data.generatedDesignId)
      .single();
    if (error || !parent) throw new Error("Design not found");
    const brief = (parent as { creative_briefs: { brief_json: unknown; final_prompt: string; negative_prompt: string } }).creative_briefs;

    const intents = detectIntents(data.userRequest);
    const intentBlock = intents.length ? `Recognized intent translations:\n- ${intents.join("\n- ")}` : "";

    const promptObj = await callGatewayJson(
      [
        { role: "system", content: `You revise a logo prompt while PRESERVING the locked design direction. Keep the business name, mark type, palette, and core composition unless the user explicitly asks to change them. Only mutate what the user requests. Always improve polish, balance, spacing, and readability. ${QUALITY_RULES}` },
        { role: "user", content: `Locked brief:\n${JSON.stringify(brief.brief_json, null, 2)}\n\nPrevious final prompt:\n${brief.final_prompt}\n\nUser revision request:\n"${data.userRequest}"\n\n${intentBlock}\n\nReturn the new final_prompt, negative_prompt, and a short design_type label.` },
      ],
      { name: "image_prompt", schema: PROMPT_SCHEMA },
    );

    const fullPrompt = `${promptObj.final_prompt}\n\nNEGATIVE: ${promptObj.negative_prompt}`;
    const dataUrl = await callGatewayImage(fullPrompt);
    const publicUrl = await uploadDataUrl(dataUrl, parent.brand_profile_id);

    const { data: newBrief } = await supabaseAdmin
      .from("creative_briefs")
      .insert({
        brand_profile_id: parent.brand_profile_id,
        brief_json: brief.brief_json,
        final_prompt: promptObj.final_prompt,
        negative_prompt: promptObj.negative_prompt,
        revision_of: parent.creative_brief_id,
      })
      .select()
      .single();

    const { data: newDesign, error: dErr } = await supabaseAdmin
      .from("generated_designs")
      .insert({
        brand_profile_id: parent.brand_profile_id,
        creative_brief_id: newBrief?.id,
        image_url: publicUrl,
        prompt_used: fullPrompt,
        design_type: promptObj.design_type,
        revision_number: (parent.revision_number || 0) + 1,
        parent_design_id: parent.id,
      })
      .select()
      .single();
    if (dErr) throw new Error(dErr.message);

    await supabaseAdmin.from("revision_requests").insert({
      brand_profile_id: parent.brand_profile_id,
      generated_design_id: data.generatedDesignId,
      user_request: data.userRequest,
      revised_prompt: fullPrompt,
      revised_image_url: publicUrl,
      new_design_id: newDesign.id,
    });

    return { design: newDesign, brief: newBrief };
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