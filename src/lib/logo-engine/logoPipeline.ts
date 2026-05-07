/**
 * Logo Pipeline — orchestrates the full flow:
 *   intake → DNA → prompt compiler → premium image → quality filter →
 *   (optional) regenerate once with failure notes → persist concept(s).
 *
 * Multi-concept support: when `outputCount > 1`, runs concepts in parallel
 * with diversified mark types so they are meaningfully different.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBrandProfileSummary } from "./brandProfile";
import { buildDesignDnaStrategy, persistDesignDnaStrategy } from "./designDna";
import { compilePrompt } from "./promptCompiler";
import { renderPremiumImage } from "./premiumImageGenerator";
import { evaluateLogo } from "./qualityFilter";
import type {
  BrandProfileSummary,
  DesignDnaStrategy,
  LogoConcept,
  LogoMarkType,
  OutputMode,
  PipelineRunOptions,
  PipelineRunResult,
  RevisionContext,
} from "./types";

const DEFAULT_OUTPUT_COUNT = 4;
const MAX_REGEN_ATTEMPTS = 2;

const MARK_DIVERSITY: LogoMarkType[] = [
  "combination",
  "wordmark",
  "monogram",
  "emblem",
  "abstract",
  "mascot",
];

const CONCEPT_HINTS: Record<LogoMarkType, string> = {
  wordmark: "Typography-forward concept. The wordmark IS the brand. Custom letterform details, single restrained accent.",
  combination: "Icon + wordmark lockup. Distinctive symbol left or above, optical kerning on the wordmark.",
  monogram: "Bespoke monogram of the initial as architectural geometry. NOT a system font letter inside a circle.",
  lettermark: "Refined initials lockup with disciplined typography.",
  emblem: "Heritage emblem / badge with concentric typography rings. Crafted, established feel.",
  abstract: "Modern simplified abstract mark. Strong silhouette, ownable shape.",
  mascot: "Friendly approachable mascot character with bold confident outlines and a clean wordmark.",
  badge: "Compact badge lockup with framed geometry.",
};

function pickMarkTypes(dna: DesignDnaStrategy, count: number, override?: LogoMarkType[]): LogoMarkType[] {
  if (override?.length) return override.slice(0, count);
  const primary = dna.logoType;
  const ordered = [primary, ...MARK_DIVERSITY.filter((m) => m !== primary)];
  return ordered.slice(0, count);
}

async function generateOneConcept(args: {
  profile: BrandProfileSummary;
  dna: DesignDnaStrategy;
  markType: LogoMarkType;
  outputMode: OutputMode;
  conceptIndex: number;
  conceptGroupId: string;
  revision?: RevisionContext;
}): Promise<LogoConcept> {
  const { profile, dna, markType, outputMode, conceptIndex, conceptGroupId, revision } = args;

  let attempt = 0;
  let prompt = compilePrompt({
    dna,
    outputMode,
    markTypeOverride: markType,
    conceptHint: CONCEPT_HINTS[markType],
    revision,
  });
  let lastImage = await renderPremiumImage({ prompt, brandProfileId: profile.brandProfileId });
  let report = await evaluateLogo({ imageUrl: lastImage.publicUrl, prompt, dna });

  while (report.decision === "rejected" && attempt < MAX_REGEN_ATTEMPTS) {
    attempt += 1;
    prompt = compilePrompt({
      dna,
      outputMode,
      markTypeOverride: markType,
      conceptHint: CONCEPT_HINTS[markType],
      revision,
      failureNotes: report,
    });
    lastImage = await renderPremiumImage({ prompt, brandProfileId: profile.brandProfileId });
    report = await evaluateLogo({ imageUrl: lastImage.publicUrl, prompt, dna });
  }

  return {
    conceptId: `${conceptGroupId}-${conceptIndex}`,
    conceptIndex,
    conceptGroupId,
    conceptName: `${markType.charAt(0).toUpperCase()}${markType.slice(1)} concept`,
    shortExplanation: CONCEPT_HINTS[markType],
    suggestedUseCase:
      outputMode === "transparent_production"
        ? "Production artwork"
        : outputMode === "one_color_test"
          ? "One-color production test"
          : outputMode === "dark_background_preview"
            ? "Dark-background preview"
            : "Client presentation",
    markType,
    outputMode,
    imageUrl: lastImage.publicUrl,
    promptUsed: prompt.finalPrompt,
    negativePrompt: prompt.negativePrompt,
    modelUsed: lastImage.modelUsed,
    designDnaUsed: dna,
    qualityReport: report,
    parentConceptId: revision?.parentConceptId,
  };
}

async function persistConcepts(
  profile: BrandProfileSummary,
  concepts: LogoConcept[],
  briefId?: string,
) {
  const rows = concepts.map((c) => ({
    brand_profile_id: profile.brandProfileId,
    creative_brief_id: briefId,
    image_url: c.imageUrl,
    prompt_used: c.promptUsed,
    design_type: c.conceptName,
    revision_number: c.parentConceptId ? 1 : 0,
    quality_score: c.qualityReport.overallScore,
    quality_decision: c.qualityReport.decision,
    quality_breakdown: c.qualityReport.breakdown as never,
    quality_notes: [...c.qualityReport.notes, "—", ...c.qualityReport.improvementHints].join("\n"),
    output_mode: c.outputMode,
    concept_index: c.conceptIndex,
    concept_group_id: c.conceptGroupId,
    model_used: c.modelUsed,
    design_dna_snapshot: c.designDnaUsed as never,
  }));
  const { data, error } = await supabaseAdmin
    .from("generated_designs")
    .insert(rows as never)
    .select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function runLogoPipeline(opts: PipelineRunOptions): Promise<PipelineRunResult & {
  designRows: unknown[];
}> {
  const profile = await loadBrandProfileSummary(opts.brandProfileId, undefined);
  const dna = await buildDesignDnaStrategy(profile, { lockedDna: opts.lockedDna });
  // Mirror strategy back into the saved design_dna table so existing UI keeps reading current DNA.
  await persistDesignDnaStrategy(opts.brandProfileId, dna).catch(() => undefined);

  const count = Math.max(1, Math.min(6, opts.outputCount ?? DEFAULT_OUTPUT_COUNT));
  const outputMode: OutputMode = opts.outputMode ?? "presentation_preview";
  const conceptGroupId =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const markTypes = pickMarkTypes(dna, count, opts.forceMarkTypes);

  // Save a creative brief row so existing UI joins still resolve.
  const briefRow = await supabaseAdmin
    .from("creative_briefs")
    .insert({
      brand_profile_id: opts.brandProfileId,
      brief_json: dna as never,
      final_prompt: `[multi-concept group ${conceptGroupId}]`,
      negative_prompt: "see compiled prompts per concept",
    })
    .select()
    .single();

  const concepts = await Promise.all(
    markTypes.map((markType, conceptIndex) =>
      generateOneConcept({
        profile,
        dna,
        markType,
        outputMode,
        conceptIndex,
        conceptGroupId,
        revision: opts.revisionContext,
      }),
    ),
  );

  const designRows = await persistConcepts(profile, concepts, briefRow.data?.id);

  return { conceptGroupId, concepts, designDna: dna, designRows };
}