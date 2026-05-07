import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/phase2.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildBrandProfileSummary,
  getMissingRequiredFields,
  isVectorConfirmed,
  MISSING_FIELDS_MESSAGE,
  VECTOR_REQUIRED_MESSAGE,
} from "@/lib/profile.shared";

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

/** Upload an existing logo (data URL) for a brand profile and persist its public URL. */
export const uploadExistingLogo = createServerFn({ method: "POST" })
  .inputValidator((input: { brandProfileId: string; dataUrl: string; filename?: string }) => input)
  .handler(async ({ data }) => {
    const m = data.dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!m) throw new Error("Invalid image data");
    const mime = m[1];
    const ext = mime.split("/")[1].split("+")[0] || "png";
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${data.brandProfileId}/existing/${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("ab-designs")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    const { data: pub } = supabaseAdmin.storage.from("ab-designs").getPublicUrl(path);
    const url = pub.publicUrl;
    const sb = getAdminClient();
    const { error: dbErr } = await sb
      .from("brand_profiles")
      .update({ existing_logo_url: url, updated_at: new Date().toISOString() } as never)
      .eq("id", data.brandProfileId);
    if (dbErr) throw new Error(dbErr.message);
    return { ok: true as const, url };
  });

/** Upload a labeled Phase-2 logo (Main / Abbreviated / Icon / Black / White / Additional). */
export const uploadPhase2Logo = createServerFn({ method: "POST" })
  .inputValidator((input: { brandProfileId: string; slot: string; dataUrl: string; filename?: string }) => input)
  .handler(async ({ data }) => {
    const m = data.dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!m) throw new Error("Invalid image data");
    const mime = m[1];
    const ext = mime.split("/")[1].split("+")[0] || "png";
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const safeSlot = data.slot.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    const path = `${data.brandProfileId}/phase2-logos/${safeSlot}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("ab-designs")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    const { data: pub } = supabaseAdmin.storage.from("ab-designs").getPublicUrl(path);
    const url = pub.publicUrl;
    const sb = getAdminClient();
    const { data: row } = await sb
      .from("brand_profiles")
      .select("phase_2_uploaded_logos")
      .eq("id", data.brandProfileId)
      .maybeSingle();
    const current = ((row?.phase_2_uploaded_logos as Record<string, string> | null) || {});
    const next = { ...current, [safeSlot]: url };
    const { error: dbErr } = await sb
      .from("brand_profiles")
      .update({ phase_2_uploaded_logos: next, updated_at: new Date().toISOString() } as never)
      .eq("id", data.brandProfileId);
    if (dbErr) throw new Error(dbErr.message);
    return { ok: true as const, url, slot: safeSlot, logos: next };
  });

/** Remove a labeled Phase-2 logo from the brand profile. */
export const removePhase2Logo = createServerFn({ method: "POST" })
  .inputValidator((input: { brandProfileId: string; slot: string }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row } = await sb
      .from("brand_profiles")
      .select("phase_2_uploaded_logos")
      .eq("id", data.brandProfileId)
      .maybeSingle();
    const current = ((row?.phase_2_uploaded_logos as Record<string, string> | null) || {});
    const safeSlot = data.slot.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    const next = { ...current };
    delete next[safeSlot];
    const { error: dbErr } = await sb
      .from("brand_profiles")
      .update({ phase_2_uploaded_logos: next, updated_at: new Date().toISOString() } as never)
      .eq("id", data.brandProfileId);
    if (dbErr) throw new Error(dbErr.message);
    return { ok: true as const, logos: next };
  });

/** Set which Phase-2 logo slots are included in the Phase-3 Brand Kit. */
export const setPhase2LogoInclusions = createServerFn({ method: "POST" })
  .inputValidator((input: { brandProfileId: string; inclusions: Record<string, boolean> }) => input)
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { error: dbErr } = await sb
      .from("brand_profiles")
      .update({ phase_2_logo_inclusions: data.inclusions, updated_at: new Date().toISOString() } as never)
      .eq("id", data.brandProfileId);
    if (dbErr) throw new Error(dbErr.message);
    return { ok: true as const, inclusions: data.inclusions };
  });