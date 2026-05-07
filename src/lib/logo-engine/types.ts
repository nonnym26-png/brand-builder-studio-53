/**
 * Logo Engine — shared types
 * ---------------------------
 * Single source of truth for the new pipeline:
 *   intake → designDna → promptCompiler → premiumImageGenerator →
 *   qualityFilter → revisionEngine → svgVectorHelper.
 */

export type OutputMode =
  | "presentation_preview"
  | "transparent_production"
  | "dark_background_preview"
  | "one_color_test";

export type LogoMarkType =
  | "wordmark"
  | "lettermark"
  | "monogram"
  | "emblem"
  | "combination"
  | "abstract"
  | "mascot"
  | "badge";

/** Distilled brand intake (what the rest of the pipeline reads from). */
export interface BrandProfileSummary {
  brandProfileId: string;
  businessName: string;
  exactLogoText: string;
  industry: string;
  services: string;
  targetCustomer: string;
  differentiator: string;
  personality: string[];
  feeling: string;
  vision: string;
  mustHave: string;
  niceToHave: string;
  taglineIdeas: string;
  inspiration: string;
  primaryHex?: string;
  accentHex?: string;
  neutralHex?: string;
  preferredColors: string;
  colorMood: string[];
  colorsToAvoid: string;
  fontStylePreferences: string[];
  logoTypePreferences: string[];
  shapePreferences: string[];
  digitalUsage: string[];
  printUsage: string[];
  symbolsToAvoid: string;
  shapesToAvoid: string;
  stylesToAvoid: string;
  fontsToAvoid: string;
  avoidanceChecklist: string[];
  mascotIdeas: string;
  initials: string;
  includeTagline: string;
  competitors: string;
  /** Optional bag of Phase 2 selections (fonts, slogan, mascot toggle, …). */
  extras?: {
    fonts?: { heading?: string; body?: string; accent?: string };
    chosenSlogan?: string | null;
    elements?: string[];
    mascot?: { enabled?: boolean; style?: string; idea?: string };
  };
}

/** Strategic Design DNA — strategy only, NOT final visual output. */
export interface DesignDnaStrategy {
  businessName: string;
  exactLogoText: string;
  industry: string;
  targetAudience: string;
  desiredImpression: string;
  brandPersonality: string[];
  logoType: LogoMarkType;
  shapeDirection: string;
  typographyDirection: string;
  colorPalette: { primary: string; accent: string; neutral: string; notes?: string };
  iconIdeas: string[];
  symbolsToAvoid: string[];
  productionUseCases: string[];
  strategicRationale: string;
  differentiationNotes: string;
  mustPreserve: string[];
  mustAvoid: string[];
}

export interface RevisionContext {
  parentConceptId?: string;
  parentDnaSnapshot?: DesignDnaStrategy;
  parentPrompt?: string;
  userRequest?: string;
  mustPreserve?: string[];
  mustChange?: string[];
  classification?: RevisionClassification;
  attempt?: number;
}

export type RevisionClassification =
  | "minor_edit"
  | "style_refinement"
  | "text_fix"
  | "color_change"
  | "layout_adjustment"
  | "background_output"
  | "full_redesign";

export interface CompiledPrompt {
  finalPrompt: string;
  negativePrompt: string;
  designType: string;
  markType: LogoMarkType;
  outputMode: OutputMode;
}

export interface GeneratedImage {
  dataUrl: string;
  modelUsed: string;
}

export interface QualityBreakdown {
  strategicFit: number;
  readability: number;
  typographyQuality: number;
  simplicity: number;
  memorability: number;
  productionReadiness: number;
  vectorReadiness: number;
  oneColorStrength: number;
  safeSpaceLayout: number;
  professionalPolish: number;
}

export type QualityDecision = "approved" | "needs_revision" | "rejected";

export interface QualityReport {
  breakdown: QualityBreakdown;
  overallScore: number;
  decision: QualityDecision;
  notes: string[];
  improvementHints: string[];
}

export interface LogoConcept {
  conceptId: string;
  conceptIndex: number;
  conceptGroupId: string;
  conceptName: string;
  shortExplanation: string;
  suggestedUseCase: string;
  markType: LogoMarkType;
  outputMode: OutputMode;
  imageUrl: string;
  promptUsed: string;
  negativePrompt: string;
  modelUsed: string;
  designDnaUsed: DesignDnaStrategy;
  qualityReport: QualityReport;
  parentConceptId?: string;
}

export interface PipelineRunOptions {
  brandProfileId: string;
  outputCount?: number; // 1..6 (default 4)
  outputMode?: OutputMode; // default presentation_preview
  forceMarkTypes?: LogoMarkType[];
  revisionContext?: RevisionContext;
  /** Override DNA strategy (used by revision engine to lock direction). */
  lockedDna?: DesignDnaStrategy;
}

export interface PipelineRunResult {
  conceptGroupId: string;
  concepts: LogoConcept[];
  designDna: DesignDnaStrategy;
}