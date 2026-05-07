import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function makeToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

const find = <T extends { design_type: string | null }>(arr: T[], re: RegExp) =>
  arr.find((a) => re.test(a.design_type || "")) || null;

/** Assemble a polished brand kit summary for Phase 3.
 *  Strips internal prompts/DNA/model details — admin-only flags decide exposure. */
export const loadBrandKit = createServerFn({ method: "GET" })
  .inputValidator((d: { brandProfileId: string; admin?: boolean }) => d)
  .handler(async ({ data }) => {
    const { data: profile, error } = await supabaseAdmin
      .from("brand_profiles")
      .select("*")
      .eq("id", data.brandProfileId)
      .single();
    if (error || !profile) throw new Error("Brand profile not found");

    const { data: designsRaw } = await supabaseAdmin
      .from("generated_designs")
      .select("id, image_url, design_type, is_approved, created_at, revision_number, quality_score, quality_decision, quality_notes, prompt_used, model_used, design_dna_snapshot")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false });
    const designs = designsRaw || [];
    const approved = designs.filter((d) => d.is_approved);

    const { data: proofs } = await supabaseAdmin
      .from("client_proofs")
      .select("id, token, status, response_kind, response_notes, submitted_at, created_at, asset_ids")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false });
    const latestProof = proofs?.[0] || null;

    const { data: revisions } = await supabaseAdmin
      .from("revision_requests")
      .select("id, user_request, created_at")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Featured assets — picked from approved set (fallback to most recent)
    const pool = approved.length ? approved : designs;
    const primary = find(pool, /refined|premium|main|original|wordmark|combination/i) || pool[0] || null;
    const transparent = find(pool, /transparent/i);
    const embroidery = find(pool, /embroidery/i);
    const badge = find(pool, /badge|emblem|crest/i);
    const social = find(pool, /favicon|social|icon/i);

    const palette = [
      { role: "primary", name: profile.primary_color_name, hex: profile.primary_hex },
      { role: "secondary", name: profile.secondary_color_name, hex: profile.secondary_hex },
      { role: "accent", name: profile.accent_color_name, hex: profile.accent_hex },
      { role: "neutral", name: profile.neutral_color_name, hex: profile.neutral_hex },
    ].filter((c) => c.hex);

    const fonts = (profile.phase_2_fonts as Record<string, string> | null) || {};
    const qualityAvg = approved.filter((d) => d.quality_score != null).length
      ? Number(
          (
            approved.filter((d) => d.quality_score != null)
              .reduce((s, d) => s + Number(d.quality_score || 0), 0) /
            approved.filter((d) => d.quality_score != null).length
          ).toFixed(1),
        )
      : null;

    const usageGuide = {
      primary: "Use the primary logo on marketing material, websites, and packaging where full color and detail can shine.",
      transparent: "Use the transparent production logo on photos, complex backgrounds, signage, and apparel mockups.",
      embroidery: "Use the embroidery-safe variant for hats, polos, jackets — designed with stitch-friendly thickness and minimal small details.",
      badge: "Use the badge / emblem mark for stickers, patches, decals, and ceremonial moments where authority and craft matter.",
      social: "Use the social / favicon mark inside circular avatars, browser tabs, and small UI elements.",
      avoid: [
        "Do not stretch, skew, or recolor the logo outside the approved palette.",
        "Do not place the primary logo on busy photos — use the transparent or one-color version instead.",
        "Do not add drop shadows, outlines, or filters not defined in this kit.",
        "Do not recreate the logo in a different typeface.",
      ],
    };

    const productionRecommendations = [
      { surface: "Apparel & uniforms", note: "Use embroidery-safe or one-color variant. Keep mark ≥ 1.5 in." },
      { surface: "Business cards", note: "Primary logo on front; one-color or reverse on back." },
      { surface: "Signage", note: "Transparent production logo at high contrast against the surface." },
      { surface: "Vehicle decals & stickers", note: "Use badge / emblem mark for impact at distance." },
      { surface: "Social media", note: "Use the social / favicon variant for avatars; primary for posts." },
      { surface: "Flyers & print collateral", note: "Primary logo with full palette; respect clear-space rules." },
      { surface: "Website & favicon", note: "Use the social mark for favicon, primary in headers." },
      { surface: "Embroidery & patches", note: "Embroidery-safe version only; avoid hairline strokes." },
    ];

    const publicView = {
      brand: {
        businessName: profile.business_name,
        industry: profile.industry,
        description: profile.business_description || profile.main_products_services || null,
        targetAudience: profile.target_customer || null,
        personality: profile.brand_personality || [],
        selectedDirection: profile.phase_2_concept_notes || profile.ab_creative_direction_notes || null,
        productsServices: profile.main_products_services || null,
        currentSetup: profile.business_stage || null,
        businessGoals: profile.brand_goals || [],
        logoDirection: profile.logo_direction || null,
        shortDescription: profile.business_description || null,
      },
      primary: primary && { id: primary.id, image_url: primary.image_url, design_type: primary.design_type },
      phase2: {
        slogans: (profile.phase_2_slogans as unknown) ?? null,
        elements: (profile.phase_2_elements as unknown) ?? null,
        mascot: (profile.phase_2_mascot as unknown) ?? null,
        conceptNotes: profile.phase_2_concept_notes || null,
        refinementNotes: profile.phase_2_refinement_notes || null,
        creativeDirection: profile.ab_creative_direction_notes || null,
      },
      variations: [
        transparent && { label: "Transparent Production Logo", id: transparent.id, image_url: transparent.image_url, design_type: transparent.design_type, use: "Use on photography, signage, and apparel mockups." },
        embroidery && { label: "Embroidery-Safe Logo", id: embroidery.id, image_url: embroidery.image_url, design_type: embroidery.design_type, use: "Use for stitched apparel — hats, polos, jackets." },
        badge && { label: "Badge / Emblem", id: badge.id, image_url: badge.image_url, design_type: badge.design_type, use: "Use on patches, decals, stamps." },
        social && { label: "Social Icon / Favicon", id: social.id, image_url: social.image_url, design_type: social.design_type, use: "Use for avatars and favicons." },
      ].filter(Boolean),
      palette,
      typography: fonts,
      usageGuide,
      productionRecommendations,
      whyThisDirection:
        profile.phase_2_concept_notes ||
        profile.diamond_recommendation_notes ||
        "This direction reflects the client's brand personality, audience expectations, and competitive positioning.",
    };

    const adminView = data.admin
      ? {
          phase1: {
            client_name: profile.client_name,
            email: profile.email_address,
            phone: profile.phone_number,
            consultation_date: profile.consultation_date,
            internal_ab_notes: profile.internal_ab_notes,
            brand_profile_summary: profile.brand_profile_summary,
          },
          allApprovedAssets: approved.map((d) => ({
            id: d.id,
            image_url: d.image_url,
            design_type: d.design_type,
            quality_score: d.quality_score,
            quality_decision: d.quality_decision,
          })),
          qualityAvg,
          revisionHistory: (revisions || []).map((r) => ({ id: r.id, request: r.user_request, at: r.created_at })),
          latestProof,
          allProofs: proofs || [],
          designDnaSummary: profile.brand_profile_summary,
          phase2RenderingStatus: profile.phase_2_rendering_status,
          brandKitExportedAt: profile.brand_kit_exported_at,
          deliveryStatus: profile.delivery_status,
        }
      : null;

    return {
      profileId: profile.id,
      status: {
        clientProofStatus: profile.client_proof_status,
        phase3CompletedAt: profile.phase_3_completed_at,
        phase2CompletedAt: profile.phase_2_completed_at,
        approvedCount: approved.length,
      },
      publicView,
      adminView,
    };
  });

/** Create or refresh a client review proof using all currently-approved assets. */
export const createBrandKitReviewLink = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("brand_profiles")
      .select("business_name, phase_2_concept_notes, ab_creative_direction_notes")
      .eq("id", data.brandProfileId)
      .single();
    if (!profile) throw new Error("Brand profile not found");
    const { data: designs } = await supabaseAdmin
      .from("generated_designs")
      .select("id")
      .eq("brand_profile_id", data.brandProfileId)
      .eq("is_approved", true);
    const ids = (designs || []).map((d) => d.id);
    if (ids.length === 0) throw new Error("Approve at least one asset before creating a review link.");

    // Reuse latest pending proof when it exists; otherwise create a new one
    const { data: existing } = await supabaseAdmin
      .from("client_proofs")
      .select("id, token, status")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existing?.[0] && existing[0].status === "pending") {
      await supabaseAdmin
        .from("client_proofs")
        .update({ asset_ids: ids })
        .eq("id", existing[0].id);
      return { token: existing[0].token, reused: true };
    }

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
      .select("token")
      .single();
    if (error) throw new Error(error.message);
    return { token: proof.token, reused: false };
  });

export const markBrandKitExported = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("brand_profiles")
      .update({ brand_kit_exported_at: new Date().toISOString(), phase_3_completed_at: new Date().toISOString() })
      .eq("id", data.brandProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reopenPhase2 = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string; reason?: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("brand_profiles")
      .update({
        client_proof_status: "full_redesign",
        phase_3_completed_at: null,
        ab_creative_direction_notes: data.reason || "Reopened from Phase 3 — exploring a new direction.",
      })
      .eq("id", data.brandProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Save an admin override note when a brand kit is sent despite failing the QA gate. */
export const saveBrandKitQaOverride = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string; reason: string; missing: string[] }) => d)
  .handler(async ({ data }) => {
    if (!data.reason || data.reason.trim().length < 5) {
      throw new Error("Override reason is required (min 5 characters).");
    }
    const { data: profile } = await supabaseAdmin
      .from("brand_profiles")
      .select("internal_ab_notes")
      .eq("id", data.brandProfileId)
      .single();
    const stamp = new Date().toISOString();
    const entry = `[QA OVERRIDE ${stamp}] Sent despite missing: ${data.missing.join(", ") || "none"}. Reason: ${data.reason.trim()}`;
    const next = profile?.internal_ab_notes ? `${profile.internal_ab_notes}\n\n${entry}` : entry;
    const { error } = await supabaseAdmin
      .from("brand_profiles")
      .update({ internal_ab_notes: next })
      .eq("id", data.brandProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });