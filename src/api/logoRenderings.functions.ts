import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/phase2.server";
import { generateLogoRenderingsForProfile } from "@/server/generateLogos.server";

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
  "status",
  "is_favorite",
  "is_selected",
  "ready_for_phase_3",
] as const;

type RenderingPatch = Partial<Record<(typeof ALLOWED_FIELDS)[number], unknown>>;

function sanitize(patch: Record<string, unknown>): RenderingPatch {
  const out: RenderingPatch = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in patch) (out as Record<string, unknown>)[k] = patch[k];
  }
  return out;
}

/** List all renderings for a given brand profile (newest first). */
export const listLogoRenderings = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: rows, error } = await sb
      .from("logo_renderings")
      .select("*")
      .eq("brand_profile_id", data.brand_profile_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Get a single rendering by id. */
export const getLogoRendering = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("logo_renderings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Create a rendering linked to a brand profile. */
export const createLogoRendering = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { brand_profile_id: string; patch?: Record<string, unknown> }) => {
      if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const insert = {
      brand_profile_id: data.brand_profile_id,
      ...sanitize(data.patch ?? {}),
    };
    const { data: row, error } = await sb
      .from("logo_renderings")
      .insert(insert as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Update any subset of allowed fields on a rendering. */
export const updateLogoRendering = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; patch: Record<string, unknown> }) => {
    if (!input?.id) throw new Error("id is required");
    if (!input?.patch || typeof input.patch !== "object") {
      throw new Error("patch is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const patch = { ...sanitize(data.patch), updated_at: new Date().toISOString() };
    const { data: row, error } = await sb
      .from("logo_renderings")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Toggle (or set) the favorite flag. */
export const setLogoRenderingFavorite = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; is_favorite: boolean }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("logo_renderings")
      .update({ is_favorite: data.is_favorite, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Mark a rendering as the selected one for its brand profile.
 * Clears is_selected on all sibling renderings (only one selected per profile)
 * and updates brand_profiles.selected_logo_rendering_id.
 */
export const selectLogoRendering = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();

    // 1. Look up the parent brand profile.
    const { data: current, error: lookupErr } = await sb
      .from("logo_renderings")
      .select("id, brand_profile_id")
      .eq("id", data.id)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!current) throw new Error("Rendering not found");

    // 2. Clear selection on siblings.
    const { error: clearErr } = await sb
      .from("logo_renderings")
      .update({ is_selected: false } as never)
      .eq("brand_profile_id", (current as { brand_profile_id: string }).brand_profile_id);
    if (clearErr) throw new Error(clearErr.message);

    // 3. Mark this one selected.
    const { data: row, error: setErr } = await sb
      .from("logo_renderings")
      .update({ is_selected: true, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (setErr) throw new Error(setErr.message);

    // 4. Reflect on the parent brand profile.
    const { error: profileErr } = await sb
      .from("brand_profiles")
      .update({ selected_logo_rendering_id: data.id } as never)
      .eq("id", (current as { brand_profile_id: string }).brand_profile_id);
    if (profileErr) throw new Error(profileErr.message);

    return row;
  });

/** Set the ready_for_phase_3 flag on a rendering. */
export const setLogoRenderingReadyForPhase3 = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; ready: boolean }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("logo_renderings")
      .update({
        ready_for_phase_3: data.ready,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Delete a rendering. Clears the parent brand_profile pointer if it matched. */
export const deleteLogoRendering = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();

    // Clear pointer on any brand profile that references this rendering.
    const { error: clearErr } = await sb
      .from("brand_profiles")
      .update({ selected_logo_rendering_id: null } as never)
      .eq("selected_logo_rendering_id", data.id);
    if (clearErr) throw new Error(clearErr.message);

    const { error } = await sb.from("logo_renderings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Generate 6 AI-produced logo renderings for a brand profile and insert them. */
export const generateLogoRenderings = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    return generateLogoRenderingsForProfile(data.brand_profile_id);
  });
