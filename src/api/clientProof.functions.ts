import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runLogoPipeline } from "@/lib/logo-engine/logoPipeline";
import { classifyRevision } from "@/lib/logo-engine/revisionEngine";
import type { DesignDnaStrategy, OutputMode } from "@/lib/logo-engine/types";

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

export const listClientProofs = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: proofs, error } = await supabaseAdmin
      .from("client_proofs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((proofs || []).map((p) => p.brand_profile_id)));
    const assetIds = Array.from(new Set((proofs || []).flatMap((p) => (p.asset_ids as string[]) || [])));
    const [{ data: profiles }, { data: assets }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("brand_profiles").select("id, business_name, client_name, industry").in("id", ids)
        : Promise.resolve({ data: [] as Array<{ id: string; business_name: string | null; client_name: string | null; industry: string | null }> }),
      assetIds.length
        ? supabaseAdmin.from("generated_designs").select("id, image_url, design_type").in("id", assetIds)
        : Promise.resolve({ data: [] as Array<{ id: string; image_url: string; design_type: string | null }> }),
    ]);
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const assetMap = new Map((assets || []).map((a) => [a.id, a]));
    const enriched = (proofs || []).map((p) => {
      const ids2 = (p.asset_ids as string[]) || [];
      const preview = ids2.map((id) => assetMap.get(id)).find((a) => a?.image_url) || null;
      return { ...p, profile: profileMap.get(p.brand_profile_id) || null, preview };
    });
    return { proofs: enriched };
  });

export const getLatestProofForProfile = createServerFn({ method: "GET" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { data: proofs, error } = await supabaseAdmin
      .from("client_proofs")
      .select("*")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return proofs?.[0] ?? null;
  });

export const adminApproveProof = createServerFn({ method: "POST" })
  .inputValidator((d: { proofId: string; notes?: string }) => d)
  .handler(async ({ data }) => {
    const { data: proof, error } = await supabaseAdmin
      .from("client_proofs")
      .select("id, brand_profile_id")
      .eq("id", data.proofId)
      .single();
    if (error || !proof) throw new Error("Proof not found");
    await supabaseAdmin
      .from("client_proofs")
      .update({
        status: "approve_final",
        response_kind: "approve_final",
        response_notes: data.notes || "Approved by AB on client behalf",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", proof.id);
    await supabaseAdmin
      .from("brand_profiles")
      .update({ client_proof_status: "approve_final", final_approval_date: new Date().toISOString() })
      .eq("id", proof.brand_profile_id);
    return { ok: true };
  });

export const markProofDelivered = createServerFn({ method: "POST" })
  .inputValidator((d: { proofId: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("client_proofs")
      .update({ acted_at: new Date().toISOString(), acted_kind: "delivered" })
      .eq("id", data.proofId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const actOnClientProof = createServerFn({ method: "POST" })
  .inputValidator((d: { proofId: string }) => d)
  .handler(async ({ data }) => {
    const { data: proof, error } = await supabaseAdmin
      .from("client_proofs")
      .select("*")
      .eq("id", data.proofId)
      .single();
    if (error || !proof) throw new Error("Proof not found");

    const notes = proof.response_notes || "";
    const brandProfileId = proof.brand_profile_id as string;

    if (proof.status === "minor_revision") {
      // Pick the most recent approved asset linked to this proof as the parent
      const ids = (proof.asset_ids as string[]) || [];
      const { data: parents } = await supabaseAdmin
        .from("generated_designs")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false })
        .limit(1);
      const parent = parents?.[0] as Record<string, unknown> | undefined;
      if (!parent) throw new Error("No parent asset found for revision");
      const lockedDna = (parent.design_dna_snapshot as DesignDnaStrategy | null) || undefined;
      const classified = classifyRevision({
        userRequest: notes,
        parentDna: lockedDna || ({} as DesignDnaStrategy),
        parentPrompt: (parent.prompt_used as string) ?? "",
        parentConceptId: parent.id as string,
      });
      const result = await runLogoPipeline({
        brandProfileId,
        outputCount: 1,
        outputMode: classified.outputModeOverride ?? ((parent.output_mode as OutputMode) ?? "presentation_preview"),
        lockedDna: classified.isFullRedesign ? undefined : lockedDna,
        revisionContext: classified.context,
      });
      const primary = result.designRows[0] as Record<string, unknown>;
      await supabaseAdmin.from("revision_requests").insert({
        brand_profile_id: brandProfileId,
        generated_design_id: parent.id as string,
        user_request: notes,
        revised_prompt: (primary.prompt_used as string) ?? "",
        revised_image_url: primary.image_url as string,
        new_design_id: primary.id as string,
      });
      await supabaseAdmin
        .from("client_proofs")
        .update({ acted_at: new Date().toISOString(), acted_kind: "minor_revision_created" })
        .eq("id", data.proofId);
      return { ok: true, kind: "minor_revision" as const, newDesignId: String(primary.id ?? ""), conceptGroupId: result.conceptGroupId };
    }

    if (proof.status === "full_redesign") {
      // Generate a brand new concept group (do not lock DNA)
      const result = await runLogoPipeline({
        brandProfileId,
        outputCount: 1,
        revisionContext: notes
          ? { userRequest: `Client requested a NEW direction. Notes: ${notes}`, classification: "full_redesign" }
          : undefined,
      });
      const primary = result.designRows[0] as Record<string, unknown>;
      await supabaseAdmin
        .from("client_proofs")
        .update({ acted_at: new Date().toISOString(), acted_kind: "new_concept_group_created" })
        .eq("id", data.proofId);
      return { ok: true, kind: "full_redesign" as const, newDesignId: String(primary.id ?? ""), conceptGroupId: result.conceptGroupId };
    }

    throw new Error("This proof has no actionable client request.");
  });