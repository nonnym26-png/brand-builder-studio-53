import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/phase2.server";

export const listBrandProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("brand_profiles")
    .select("id, business_name, client_name, industry, project_status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const loadBrandProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb.from("brand_profiles").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveConcepts = createServerFn({ method: "POST" })
  .inputValidator((input: {
    id: string;
    concepts: unknown;
    selected?: unknown;
    notes?: string;
    aiPrompt?: string;
  }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { error } = await sb
      .from("brand_profiles")
      .update({
        phase_2_logo_concepts: data.concepts as never,
        selected_logo_concept: (data.selected ?? null) as never,
        phase_2_concept_notes: data.notes ?? null,
        phase_2_ai_prompt: data.aiPrompt ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateAIDirections = createServerFn({ method: "POST" })
  .inputValidator((input: { profile: Record<string, unknown>; baseConcepts: Array<{ id: string; name: string; markType: string; moodWords: string[] }> }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway is not configured.");

    const system = `You are a senior brand strategist at Anaglyph Branding (AB).
You receive a completed brand profile and a list of pre-selected logo direction archetypes (wordmark, combination, monogram, emblem, abstract, mascot).
For EACH archetype, write a sharp strategic direction that ties it to the client's industry, audience, differentiator and personality.
Return ONLY through the provided tool. Voice: confident, agency-grade, specific. No fluff.`;

    const user = `BRAND PROFILE:\n${JSON.stringify(data.profile, null, 2)}\n\nARCHETYPES (return one direction per id, in order):\n${JSON.stringify(data.baseConcepts, null, 2)}`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_directions",
            description: "Return strategic directions, one per archetype id, in order.",
            parameters: {
              type: "object",
              properties: {
                directions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string", description: "Distinct, evocative direction name (2-4 words)." },
                      tagline: { type: "string", description: "5-9 word strategic line." },
                      rationale: { type: "string", description: "2-4 sentences. Why this direction fits THIS brand." },
                      moodWords: { type: "array", items: { type: "string" }, description: "3-5 mood words." },
                      usageNotes: { type: "string", description: "1-2 sentences on where this lockup shines." },
                    },
                    required: ["id", "name", "tagline", "rationale", "moodWords", "usageNotes"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["directions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_directions" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      throw new Error(`AI gateway error (${resp.status})`);
    }

    const json = await resp.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) throw new Error("AI returned no tool call");
    const parsed = JSON.parse(args);
    return parsed.directions as Array<{
      id: string; name: string; tagline: string; rationale: string; moodWords: string[]; usageNotes: string;
    }>;
  });

/** Mark a phase complete with timestamp. */
export const markPhaseComplete = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; phase: 1 | 2 | 3 }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const col = `phase_${data.phase}_completed_at`;
    const { error } = await sb
      .from("brand_profiles")
      .update({ [col]: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Persist Phase 2 creative selections (palette, fonts, slogans, elements, mascot). */
export const savePhase2Selections = createServerFn({ method: "POST" })
  .inputValidator((input: {
    id: string;
    palette?: Record<string, string> | null;
    fonts?: { heading?: string; body?: string; accent?: string } | null;
    slogans?: string[] | null;
    chosenSlogan?: string | null;
    elements?: string[] | null;
    mascot?: { enabled: boolean; style?: string; idea?: string } | null;
  }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.palette) {
      patch.primary_hex = data.palette.primary ?? null;
      patch.secondary_hex = data.palette.secondary ?? null;
      patch.accent_hex = data.palette.accent ?? null;
      patch.neutral_hex = data.palette.neutral ?? null;
    }
    if (data.fonts) patch.phase_2_fonts = data.fonts;
    if (data.slogans) patch.phase_2_slogans = data.slogans;
    if (data.chosenSlogan !== undefined) patch.tagline_ideas = data.chosenSlogan ?? null;
    if (data.elements) patch.phase_2_elements = data.elements;
    if (data.mascot) patch.phase_2_mascot = data.mascot;
    const { error } = await sb.from("brand_profiles").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Generate slogan / tagline candidates via Lovable AI Gateway. */
export const generateSlogans = createServerFn({ method: "POST" })
  .inputValidator((input: { profile: Record<string, unknown>; count?: number; tone?: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway is not configured.");
    const count = Math.min(Math.max(data.count ?? 6, 3), 12);

    const system = `You are a senior copy director at Anaglyph Branding (AB).
Write slogan / tagline candidates for the supplied brand. Voice: confident, premium, specific. No clichés. No generic agency speak. 3-7 words each.`;
    const user = `BRAND PROFILE:\n${JSON.stringify(data.profile, null, 2)}\n\nReturn ${count} distinct slogans${data.tone ? ` in a ${data.tone} tone` : ""}.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_slogans",
          description: "Return slogan candidates.",
          parameters: {
            type: "object",
            properties: { slogans: { type: "array", items: { type: "string" } } },
            required: ["slogans"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_slogans" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      throw new Error(`AI gateway error (${resp.status})`);
    }
    const json = await resp.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no tool call");
    const parsed = JSON.parse(args);
    return (parsed.slogans as string[]).filter((s) => typeof s === "string" && s.trim());
  });