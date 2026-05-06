import { createServerFn } from "@tanstack/react-start";
import { generateAndSaveDesignDna } from "@/server/designDna.server";
import { getAdminClient } from "@/server/phase2.server";

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/** Build (or rebuild) the Design DNA for a brand profile and persist it. */
export const generateDesignDna = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    return generateAndSaveDesignDna(data.brand_profile_id);
  });

/** Read the saved Design DNA for a brand profile (may be null). */
export const getDesignDna = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("brand_profiles")
      .select("design_dna, design_dna_generated_at")
      .eq("id", data.brand_profile_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      design_dna: (row?.design_dna ?? null) as Json,
      generated_at: (row?.design_dna_generated_at as string | null) ?? null,
    };
  });

/* ------------------------------------------------------------------ */
/* Design DNA editor — separate `design_dna` table, one row per brand. */
/* ------------------------------------------------------------------ */

export const DESIGN_DNA_FIELDS = [
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
  "spacing_rules",
  "color_hierarchy",
  "accent_color_usage",
  "layout_system",
  "composition_notes",
  "premium_design_rules",
  "production_rules",
  "social_media_rules",
  "logo_variation_rules",
  "avoidance_rules",
  "designer_notes",
] as const;

export type DesignDnaRecord = {
  id: string;
  brand_profile_id: string;
  created_at: string;
  updated_at: string;
} & Partial<Record<(typeof DESIGN_DNA_FIELDS)[number], string | null>>;

function pickFields(input: Record<string, unknown>) {
  const out: Record<string, string | null> = {};
  for (const k of DESIGN_DNA_FIELDS) {
    if (k in input) {
      const v = input[k];
      out[k] = v == null ? null : String(v).slice(0, 4000);
    }
  }
  return out;
}

/** Load the design_dna row for a brand profile (may be null). */
export const loadDesignDnaRecord = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("design_dna")
      .select("*")
      .eq("brand_profile_id", data.brand_profile_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { record: (row ?? null) as DesignDnaRecord | null };
  });

/** Upsert the design_dna row for a brand profile. */
export const saveDesignDnaRecord = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { brand_profile_id: string; values: Record<string, unknown> }) => {
      if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
      if (!input?.values || typeof input.values !== "object")
        throw new Error("values is required");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const patch = pickFields(data.values);

    const { data: existing, error: findErr } = await sb
      .from("design_dna")
      .select("id")
      .eq("brand_profile_id", data.brand_profile_id)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);

    if (existing?.id) {
      const { data: updated, error } = await sb
        .from("design_dna")
        .update(patch as never)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { record: updated as DesignDnaRecord };
    }

    const { data: inserted, error } = await sb
      .from("design_dna")
      .insert({ brand_profile_id: data.brand_profile_id, ...patch } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { record: inserted as DesignDnaRecord };
  });