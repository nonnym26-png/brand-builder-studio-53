import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DeliveryStatus =
  | "needs_final_kit"
  | "kit_prepared"
  | "sent"
  | "delivered";

export const listFinalDeliveries = createServerFn({ method: "GET" }).handler(async () => {
  // Pull profiles where the client approved as final OR an admin already kicked off delivery.
  const { data: profiles, error } = await supabaseAdmin
    .from("brand_profiles")
    .select(
      "id, business_name, client_name, industry, phase_2_concept_notes, ab_creative_direction_notes, client_proof_status, delivery_status, delivery_notes, final_file_link, delivery_date, internal_production_notes, final_approval_date, brand_kit_exported_at, updated_at"
    )
    .or("client_proof_status.eq.approve_final,delivery_status.not.is.null")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (profiles || []).map((p) => p.id);
  if (ids.length === 0) return { deliveries: [] };

  const [{ data: assets }, { data: proofs }] = await Promise.all([
    supabaseAdmin
      .from("generated_designs")
      .select("id, brand_profile_id, image_url, design_type, is_approved, created_at")
      .in("brand_profile_id", ids)
      .eq("is_approved", true),
    supabaseAdmin
      .from("client_proofs")
      .select("id, brand_profile_id, status, submitted_at, selected_direction")
      .in("brand_profile_id", ids)
      .eq("status", "approve_final")
      .order("submitted_at", { ascending: false }),
  ]);

  const previewByProfile = new Map<string, { image_url: string; design_type: string | null }>();
  for (const a of assets || []) {
    if (!previewByProfile.has(a.brand_profile_id)) {
      previewByProfile.set(a.brand_profile_id, { image_url: a.image_url, design_type: a.design_type });
    }
  }
  const proofByProfile = new Map<string, { submitted_at: string | null; selected_direction: string | null }>();
  for (const p of proofs || []) {
    if (!proofByProfile.has(p.brand_profile_id)) {
      proofByProfile.set(p.brand_profile_id, { submitted_at: p.submitted_at, selected_direction: p.selected_direction });
    }
  }
  const approvedCounts = new Map<string, number>();
  for (const a of assets || []) approvedCounts.set(a.brand_profile_id, (approvedCounts.get(a.brand_profile_id) || 0) + 1);

  const deliveries = (profiles || []).map((p) => {
    const proof = proofByProfile.get(p.id);
    const approval = p.final_approval_date || proof?.submitted_at || null;
    const status: DeliveryStatus = (p.delivery_status as DeliveryStatus) || "needs_final_kit";
    return {
      id: p.id,
      business_name: p.business_name,
      client_name: p.client_name,
      industry: p.industry,
      selected_direction: proof?.selected_direction || p.phase_2_concept_notes || p.ab_creative_direction_notes || null,
      final_approval_date: approval,
      preview: previewByProfile.get(p.id) || null,
      delivery_status: status,
      delivery_notes: p.delivery_notes,
      final_file_link: p.final_file_link,
      delivery_date: p.delivery_date,
      internal_production_notes: p.internal_production_notes,
      brand_kit_exported_at: p.brand_kit_exported_at,
      approved_asset_count: approvedCounts.get(p.id) || 0,
    };
  });

  return { deliveries };
});

export const updateDelivery = createServerFn({ method: "POST" })
  .inputValidator((d: {
    brandProfileId: string;
    delivery_status?: DeliveryStatus;
    delivery_notes?: string | null;
    final_file_link?: string | null;
    internal_production_notes?: string | null;
    delivery_date?: string | null;
    brand_kit_exported_at?: string | null;
    final_approval_date?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = {};
    for (const k of [
      "delivery_status",
      "delivery_notes",
      "final_file_link",
      "internal_production_notes",
      "delivery_date",
      "brand_kit_exported_at",
      "final_approval_date",
    ] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("brand_profiles")
      .update(patch)
      .eq("id", data.brandProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reopenDelivery = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("brand_profiles")
      .update({ delivery_status: "sent", delivery_date: null })
      .eq("id", data.brandProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });