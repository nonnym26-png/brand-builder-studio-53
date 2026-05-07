/**
 * SVG / Vector Helper — SECONDARY production helper, NOT the main renderer.
 *
 * This module deliberately does NOT generate finished premium logos.
 * It produces simplified vector-cleanup ideas that a designer can use
 * after a Premium Image concept has already been approved:
 *   - icon-only structure tests
 *   - one-color silhouette tests
 *   - rough production path drafts
 *
 * UI label rules: "Vector helper concept", "One-color structure test",
 * "Simplified production guide", "SVG cleanup draft".
 * NEVER label these as the final premium logo.
 */

import type { DesignDnaStrategy } from "./types";

/**
 * Re-export of the existing SVG rendering pathway, intentionally renamed so
 * the rest of the codebase imports it as a HELPER, not as the premium engine.
 * The legacy implementation lives in `src/server/abLogoRenderingPrompt.server.ts`
 * and `src/api/logoRenderings.functions.ts`. Phase 2 (UI work) will wire those
 * outputs behind a "Vector / Production Helper" tab that only appears after a
 * premium image has been approved.
 */
export { runAbLogoRenderingPrompt as runVectorHelperConcepts } from "@/server/abLogoRenderingPrompt.server";

/** Human-readable purpose statement for the Phase-2 UI panel. */
export const VECTOR_HELPER_DESCRIPTION =
  "This tool creates simplified SVG/vector-style structure ideas based on your approved logo direction. It is useful for production cleanup, one-color testing, embroidery planning, signage simplification, and future vector redraw support. It is NOT the premium logo output.";

export interface VectorHelperLabelSet {
  cardLabel: string;
  fileLabel: string;
  fallbackLabel: string;
}

export const VECTOR_HELPER_LABELS: VectorHelperLabelSet = {
  cardLabel: "Vector helper concept",
  fileLabel: "Simplified production guide (SVG)",
  fallbackLabel: "Fallback vector concept preview — not premium image rendering",
};

/** Used by the UI to decide whether the helper panel should be shown at all. */
export function shouldOfferVectorHelper(args: {
  hasApprovedPremiumImage: boolean;
  userExplicitlyRequested?: boolean;
}): boolean {
  return Boolean(args.hasApprovedPremiumImage || args.userExplicitlyRequested);
}

/** Stub kept so future helper logic can hang off the strategic DNA. */
export function vectorHelperPromptSeed(dna: DesignDnaStrategy): string {
  return `Simplified ${dna.logoType} cleanup based on approved direction for ${dna.businessName}. Solid fills, no gradients, single-ink friendly.`;
}