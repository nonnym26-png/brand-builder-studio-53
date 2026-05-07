import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function makeToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createClientProof = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const [{ data: profile }, { data: designs }] = await Promise.all([
      supabaseAdmin.from("brand_profiles").select("business_name, phase_2_concept_notes, ab_creative_direction_notes").eq("id", data.brandProfileId).single(),
      supabaseAdmin
        .from("generated_designs")
        .select("id")
        .eq("brand_profile_id", data.brandProfileId)
        .eq("is_approved", true),
    ]);
    if (!profile) throw new Error("Brand profile not found");
    const ids = (designs || []).map((d) => d.id);
    if (ids.length === 0) throw new Error("Approve at least one asset before creating a proof.");
    const token = makeToken();
    const { data: proof, error } = await supabaseAdmin
      .from("client_proofs")
      .insert({
        brand_profile_id: data.brandProfileId,
        token,
        business_name: profile.business_name,
        selected_direction: profile.phase_2_concept_notes || profile.ab_creative_direction_notes || null,
        asset_ids: ids,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { proofId: proof.id, token };
  });

export const getClientProof = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: proof, error } = await supabaseAdmin
      .from("client_proofs")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proof) throw new Error("Proof not found");

    const [{ data: profile }, { data: assets }] = await Promise.all([
      supabaseAdmin
        .from("brand_profiles")
        .select("business_name, industry, primary_color_name, primary_hex, secondary_color_name, secondary_hex, accent_color_name, accent_hex, neutral_color_name, neutral_hex, phase_2_fonts, digital_usage_notes, print_production_notes, phase_2_concept_notes")
        .eq("id", proof.brand_profile_id)
        .single(),
      supabaseAdmin
        .from("generated_designs")
        .select("id, design_type, image_url, revision_number")
        .in("id", proof.asset_ids as string[]),
    ]);

    return { proof, profile, assets: assets || [] };
  });

export const submitClientProofResponse = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; kind: "approve_final" | "minor_revision" | "full_redesign"; notes?: string }) => d)
  .handler(async ({ data }) => {
    const { data: proof, error: pErr } = await supabaseAdmin
      .from("client_proofs")
      .select("id, brand_profile_id, status")
      .eq("token", data.token)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!proof) throw new Error("Proof not found");
    if (proof.status !== "pending") throw new Error("This proof has already been submitted.");

    const { error: uErr } = await supabaseAdmin
      .from("client_proofs")
      .update({
        status: data.kind,
        response_kind: data.kind,
        response_notes: data.notes || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", proof.id);
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin
      .from("brand_profiles")
      .update({ client_proof_status: data.kind })
      .eq("id", proof.brand_profile_id);

    return { ok: true };
  });