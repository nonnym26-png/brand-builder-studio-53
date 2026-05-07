import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RangeKey = "today" | "week" | "month" | "all";

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (range === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (range === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
  return null;
}

export const getAbDashboard = createServerFn({ method: "GET" })
  .inputValidator((d: { range?: RangeKey }) => d ?? {})
  .handler(async ({ data }) => {
    const range = data.range || "all";
    const since = rangeStart(range);
    const sinceIso = since ? since.toISOString() : null;

    const [profilesRes, designsRes, proofsRes, revisionsRes] = await Promise.all([
      supabaseAdmin
        .from("brand_profiles")
        .select("id, business_name, client_name, industry, project_status, client_proof_status, delivery_status, brand_kit_exported_at, updated_at, created_at, phase_2_concept_notes"),
      supabaseAdmin
        .from("generated_designs")
        .select("id, brand_profile_id, image_url, design_type, is_approved, quality_score, created_at"),
      supabaseAdmin
        .from("client_proofs")
        .select("id, brand_profile_id, business_name, status, acted_at, acted_kind, created_at, submitted_at, response_notes"),
      supabaseAdmin
        .from("revision_requests")
        .select("id, brand_profile_id, user_request, created_at"),
    ]);

    const profiles = profilesRes.data || [];
    const designs = designsRes.data || [];
    const proofs = proofsRes.data || [];
    const revisions = revisionsRes.data || [];

    const inRange = <T extends { created_at?: string | null }>(rows: T[]) =>
      sinceIso ? rows.filter((r) => (r.created_at || "") >= sinceIso) : rows;

    const profileById = new Map(profiles.map((p) => [p.id, p]));

    // Stats
    const activeProjects = profiles.filter((p) => (p.project_status || "").toLowerCase() !== "delivered" && p.delivery_status !== "delivered").length;
    const pendingProofs = proofs.filter((p) => p.status === "pending").length;
    const minorRevisions = proofs.filter((p) => p.status === "minor_revision").length;
    const newDirections = proofs.filter((p) => p.status === "full_redesign").length;
    const approvedNeedsKit = profiles.filter((p) => p.client_proof_status === "approve_final" && (p.delivery_status || "needs_final_kit") === "needs_final_kit").length;
    const finalKitsSent = profiles.filter((p) => p.delivery_status === "sent" || p.delivery_status === "kit_prepared").length;
    const delivered = profiles.filter((p) => p.delivery_status === "delivered").length;
    const scoredDesigns = designs.filter((d) => typeof d.quality_score === "number");
    const avgQuality = scoredDesigns.length ? scoredDesigns.reduce((s, d) => s + Number(d.quality_score || 0), 0) / scoredDesigns.length : 0;
    const totalKitsExported = profiles.filter((p) => !!p.brand_kit_exported_at).length;

    // Recent activity
    type Activity = {
      kind: string;
      label: string;
      at: string;
      brand_profile_id: string;
      business_name: string | null;
    };
    const acts: Activity[] = [];
    for (const d of designs) {
      const p = profileById.get(d.brand_profile_id);
      acts.push({ kind: "concept_generated", label: "New concept generated", at: d.created_at, brand_profile_id: d.brand_profile_id, business_name: p?.business_name || null });
      if (d.is_approved) acts.push({ kind: "concept_approved", label: "Concept approved", at: d.created_at, brand_profile_id: d.brand_profile_id, business_name: p?.business_name || null });
    }
    for (const r of revisions) {
      const p = profileById.get(r.brand_profile_id);
      acts.push({ kind: "revision_requested", label: "Revision requested", at: r.created_at, brand_profile_id: r.brand_profile_id, business_name: p?.business_name || null });
    }
    for (const pr of proofs) {
      const p = profileById.get(pr.brand_profile_id);
      const name = pr.business_name || p?.business_name || null;
      acts.push({ kind: "proof_sent", label: "Client proof sent", at: pr.created_at, brand_profile_id: pr.brand_profile_id, business_name: name });
      if (pr.submitted_at) {
        if (pr.status === "approve_final") acts.push({ kind: "client_approved", label: "Client approved as final", at: pr.submitted_at, brand_profile_id: pr.brand_profile_id, business_name: name });
        if (pr.status === "minor_revision") acts.push({ kind: "client_minor", label: "Client requested minor revision", at: pr.submitted_at, brand_profile_id: pr.brand_profile_id, business_name: name });
        if (pr.status === "full_redesign") acts.push({ kind: "client_new_direction", label: "Client requested new direction", at: pr.submitted_at, brand_profile_id: pr.brand_profile_id, business_name: name });
      }
    }
    for (const p of profiles) {
      if (p.brand_kit_exported_at) acts.push({ kind: "kit_exported", label: "Brand kit exported", at: p.brand_kit_exported_at, brand_profile_id: p.id, business_name: p.business_name });
      if (p.delivery_status === "sent") acts.push({ kind: "files_sent", label: "Final files sent to client", at: p.updated_at || p.created_at || new Date().toISOString(), brand_profile_id: p.id, business_name: p.business_name });
      if (p.delivery_status === "delivered") acts.push({ kind: "delivered", label: "Project delivered / closed", at: p.updated_at || p.created_at || new Date().toISOString(), brand_profile_id: p.id, business_name: p.business_name });
    }
    const activityFiltered = sinceIso ? acts.filter((a) => a.at >= sinceIso) : acts;
    activityFiltered.sort((a, b) => (a.at < b.at ? 1 : -1));

    // Needs attention
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const approvedNoKit = profiles
      .filter((p) => p.client_proof_status === "approve_final" && !p.brand_kit_exported_at)
      .map((p) => ({ kind: "approved_no_kit", label: "Approved but no brand kit exported", brand_profile_id: p.id, business_name: p.business_name }));
    const stalePending = proofs
      .filter((p) => p.status === "pending" && p.created_at < threeDaysAgo)
      .map((p) => ({ kind: "stale_pending", label: `Pending proof older than 3 days (${new Date(p.created_at).toLocaleDateString()})`, brand_profile_id: p.brand_profile_id, business_name: p.business_name || profileById.get(p.brand_profile_id)?.business_name || null }));
    const minorNotActioned = proofs
      .filter((p) => p.status === "minor_revision" && !p.acted_at)
      .map((p) => ({ kind: "minor_not_actioned", label: "Minor revision request not actioned", brand_profile_id: p.brand_profile_id, business_name: p.business_name || profileById.get(p.brand_profile_id)?.business_name || null }));
    const preparedNotSent = profiles
      .filter((p) => p.delivery_status === "kit_prepared")
      .map((p) => ({ kind: "prepared_not_sent", label: "Final kit prepared but not sent", brand_profile_id: p.id, business_name: p.business_name }));
    const sentNotDelivered = profiles
      .filter((p) => p.delivery_status === "sent")
      .map((p) => ({ kind: "sent_not_delivered", label: "Sent kit not marked delivered", brand_profile_id: p.id, business_name: p.business_name }));
    const rejectedConcepts: { kind: string; label: string; brand_profile_id: string; business_name: string | null }[] = [];
    // Treat designs with quality_decision === 'reject' as rejected concepts
    {
      const { data: rejected } = await supabaseAdmin
        .from("generated_designs")
        .select("id, brand_profile_id, created_at")
        .eq("quality_decision", "reject");
      for (const r of rejected || []) {
        const p = profileById.get(r.brand_profile_id);
        rejectedConcepts.push({ kind: "rejected_concept", label: `Rejected concept (${new Date(r.created_at).toLocaleDateString()})`, brand_profile_id: r.brand_profile_id, business_name: p?.business_name || null });
      }
    }
    const attention = [...rejectedConcepts, ...stalePending, ...approvedNoKit, ...minorNotActioned, ...preparedNotSent, ...sentNotDelivered];

    return {
      range,
      stats: {
        activeProjects,
        pendingProofs,
        minorRevisions,
        newDirections,
        approvedNeedsKit,
        finalKitsSent,
        delivered,
        avgQuality: Math.round(avgQuality * 10) / 10,
        totalKitsExported,
        // Range-scoped counts for the activity feed
        recentConceptsCount: inRange(designs).length,
      },
      activity: activityFiltered.slice(0, 30),
      attention,
    };
  });