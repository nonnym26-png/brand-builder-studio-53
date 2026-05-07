/**
 * Prompt Compiler
 * ---------------
 * Single source of truth for the final image-model prompt. Takes the strategic
 * Design DNA + output mode + (optional) revision context + (optional) failure
 * notes from the previous attempt, and produces a structured prompt the
 * Premium Image Generator can send to the model.
 *
 * Note: prompts here are intentionally LOOSE on layout. We give the model
 * direction, not a rigid template.
 */

import type {
  CompiledPrompt,
  DesignDnaStrategy,
  LogoMarkType,
  OutputMode,
  QualityReport,
  RevisionContext,
} from "./types";

function backgroundForMode(mode: OutputMode): string {
  switch (mode) {
    case "transparent_production":
      return "Render the artwork ISOLATED on a fully transparent background. No frame, no plate, no scene.";
    case "dark_background_preview":
      return "Place the logo on a deep neutral dark background (near-black). Use the inverted/lightened versions of the brand colors so the mark stays legible.";
    case "one_color_test":
      return "Render in ONE solid ink only (black on white, OR white on black). No accent color, no gradient. This is a one-color production test.";
    case "presentation_preview":
    default:
      return "Render on a clean neutral background (white or very light grey) suitable for a presentation slide. NO mockup scenes, NO shirts, walls, signs, paper, or rooms.";
  }
}

const UNIVERSAL_NEGATIVE = [
  "no clipart",
  "no stock-logo style",
  "no mockups, no shirts, no signs, no walls, no paper, no rooms",
  "no fake scenes",
  "no watermarks",
  "no extra words",
  "no misspellings",
  "no fake letters or invented characters",
  "no famous brand imitation",
  "no rainbow palettes",
  "no busy backgrounds",
  "no thin unreadable text",
  "no photo-realistic rendering",
  "no 3D bevels, no glow, no heavy shadows",
  "no generic AI-logo symbols (sparkles, brain, lightbulb-with-gear)",
].join(", ");

export function compilePrompt(args: {
  dna: DesignDnaStrategy;
  outputMode: OutputMode;
  markTypeOverride?: LogoMarkType;
  conceptHint?: string;
  revision?: RevisionContext;
  failureNotes?: QualityReport;
}): CompiledPrompt {
  const { dna, outputMode } = args;
  const markType = args.markTypeOverride || dna.logoType;
  const palette = dna.colorPalette;

  const bgLine = backgroundForMode(outputMode);

  const conceptDirection = args.conceptHint
    ? `CONCEPT DIRECTION FOR THIS RENDER: ${args.conceptHint}.`
    : "";

  const revisionBlock = args.revision
    ? `REVISION CONTEXT — preserve what was approved.
Approved direction summary: ${args.revision.parentDnaSnapshot ? `${args.revision.parentDnaSnapshot.logoType} mark in ${args.revision.parentDnaSnapshot.shapeDirection}` : "previous concept"}.
User asked: "${args.revision.userRequest || ""}".
Must preserve: ${(args.revision.mustPreserve || dna.mustPreserve).join("; ") || "—"}.
Must change: ${(args.revision.mustChange || []).join("; ") || "—"}.
Only mutate what the user requested. Do NOT redesign the whole logo.`
    : "";

  const failureBlock = args.failureNotes
    ? `PREVIOUS ATTEMPT FAILED THE QUALITY GATE. Fix these specifically:
- ${args.failureNotes.notes.join("\n- ")}
Improvement guidance:
- ${args.failureNotes.improvementHints.join("\n- ")}`
    : "";

  const finalPrompt = `TASK
Create an original, non-infringing, production-ready logo for ${dna.businessName}.

EXACT TEXT
Render the brand name exactly as "${dna.exactLogoText}". Do not add extra text. Do not misspell. Do not invent extra letters.

BRAND CONTEXT
- Industry: ${dna.industry || "—"}
- Target audience: ${dna.targetAudience || "—"}
- Desired impression: ${dna.desiredImpression || "—"}
- Brand personality: ${dna.brandPersonality.join(", ") || "—"}
- Strategic rationale: ${dna.strategicRationale || "—"}
- Differentiation: ${dna.differentiationNotes || "—"}

DESIGN DIRECTION (Design DNA)
- Logo type: ${markType}
- Shape direction: ${dna.shapeDirection || "—"}
- Typography direction: ${dna.typographyDirection || "—"}
- Color palette: primary ${palette.primary}, accent ${palette.accent}, neutral ${palette.neutral}${palette.notes ? ` (${palette.notes})` : ""}
- Icon ideas to consider: ${dna.iconIdeas.join("; ") || "—"}
- Symbols to avoid: ${dna.symbolsToAvoid.join("; ") || "—"}

${conceptDirection}

PRODUCTION REQUIREMENTS
Must work for: apparel, signage, business cards, website, social media, print.
Use cases the client cares about: ${dna.productionUseCases.join(", ") || "general identity use"}.

STYLE
- Professional brand-studio quality. Looks paid, not auto-generated.
- Clean vector-like forms, flat solid fills.
- Strong visual hierarchy, balanced negative space.
- Readable typography at small sizes.
- Simple enough to reproduce, distinct enough to feel ownable.
- Disciplined color use: 1–3 solid colors maximum.

OUTPUT MODE
${outputMode}
${bgLine}

${revisionBlock}

${failureBlock}

NEGATIVE CONSTRAINTS
${UNIVERSAL_NEGATIVE}.
Also avoid: ${dna.mustAvoid.join("; ") || "—"}.`;

  return {
    finalPrompt: finalPrompt.replace(/\n{3,}/g, "\n\n").trim(),
    negativePrompt: UNIVERSAL_NEGATIVE,
    designType: `${markType} (${outputMode})`,
    markType,
    outputMode,
  };
}