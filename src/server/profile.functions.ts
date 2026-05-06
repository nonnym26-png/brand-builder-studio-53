import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "./phase2.server";
import {
  buildBrandProfileSummary,
  getMissingRequiredFields,
  isVectorConfirmed,
  MISSING_FIELDS_MESSAGE,
  VECTOR_REQUIRED_MESSAGE,
} from "./profile.shared";

type ProfilePatch = Record<string, unknown>;

function sanitize(patch: ProfilePatch): ProfilePatch {
  // Never let client overwrite system flags via the draft endpoint
  const { id, created_at, updated_at, is_complete, ready_for_phase_2, brand_profile_summary, ...rest } = patch;
  void id; void created_at; void updated_at; void is_complete; void ready_for_phase_2; void brand_profile_summary;
  return rest;
}

/** 1) Save Draft — upsert any subset of fields, keeps is_draft=true. */
export const saveBrandProfileDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string; patch: ProfilePatch }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const patch = { ...sanitize(data.patch), is_draft: true, updated_at: new Date().toISOString() };

    if (data.id) {
      const { data: row, error } = await sb
        .from("brand_profiles")
        .update(patch as never)
        .eq("id", data.id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { ok: true as const, profile: row };
    }

    const { data: row, error } = await sb
      .from("brand_profiles")
      .insert(patch as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, profile: row };
  });

/** 2) Complete Brand Profile — marks is_complete=true (does NOT yet move to Phase 2). */
export const completeBrandProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("brand_profiles")
      .update({
        is_complete: true,
        is_draft: false,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, profile: row };
  });

/** 3) Generate Brand Profile Summary — creates a clean summary from form data. */
export const generateBrandProfileSummary = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb.from("brand_profiles").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Profile not found");

    const summary = buildBrandProfileSummary(row as Record<string, unknown>);
    const { data: updated, error: upErr } = await sb
      .from("brand_profiles")
      .update({ brand_profile_summary: summary, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (upErr) throw new Error(upErr.message);
    return { ok: true as const, summary, profile: updated };
  });

/** 4) Mark Ready for Phase 2 — only allowed when required fields + vector confirmation are set. */
export const markReadyForPhase2 = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb.from("brand_profiles").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Profile not found");

    const missing = getMissingRequiredFields(row as Record<string, unknown>);
    if (missing.length > 0) {
      return { ok: false as const, code: "missing_fields" as const, message: MISSING_FIELDS_MESSAGE, missing };
    }
    if (!isVectorConfirmed(row as Record<string, unknown>)) {
      return { ok: false as const, code: "vector_not_confirmed" as const, message: VECTOR_REQUIRED_MESSAGE };
    }

    const { data: updated, error: upErr } = await sb
      .from("brand_profiles")
      .update({
        ready_for_phase_2: true,
        is_complete: true,
        is_draft: false,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (upErr) throw new Error(upErr.message);
    return { ok: true as const, profile: updated };
  });