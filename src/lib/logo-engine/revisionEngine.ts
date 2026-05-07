/**
 * Revision Engine
 * ---------------
 * Preserves approved Design DNA across revisions. Classifies the user's
 * request into a revision type and decides whether to keep the locked DNA
 * (most cases) or restart from scratch (full_redesign only).
 */

import type {
  DesignDnaStrategy,
  OutputMode,
  RevisionClassification,
  RevisionContext,
} from "./types";

export interface ClassifyArgs {
  userRequest: string;
  parentDna: DesignDnaStrategy;
  parentPrompt?: string;
  parentConceptId?: string;
}

export interface ClassifiedRevision {
  classification: RevisionClassification;
  context: RevisionContext;
  /** If the revision is purely a background/output-mode swap, the new mode. */
  outputModeOverride?: OutputMode;
  /** True when the engine should rerun the full pipeline (DNA regeneration). */
  isFullRedesign: boolean;
}

const RULES: Array<{
  test: RegExp;
  classification: RevisionClassification;
  mustPreserve?: (dna: DesignDnaStrategy) => string[];
  mustChange?: () => string[];
  outputMode?: OutputMode;
}> = [
  {
    test: /\b(start over|new direction|completely different|throw it out|fresh)\b/i,
    classification: "full_redesign",
    mustChange: () => ["everything"],
  },
  {
    test: /\b(remove (the )?background|transparent|isolate)\b/i,
    classification: "background_output",
    mustPreserve: (d) => [`every visual decision: ${d.logoType}, ${d.shapeDirection}, ${d.typographyDirection}`],
    mustChange: () => ["background only"],
    outputMode: "transparent_production",
  },
  {
    test: /\b(dark background|on (a )?dark|night mode|inverted)\b/i,
    classification: "background_output",
    mustPreserve: (d) => [`logo geometry and ${d.logoType} layout`],
    mustChange: () => ["background to dark, invert/lighten where needed"],
    outputMode: "dark_background_preview",
  },
  {
    test: /\b(one[- ]color|black ?and ?white|single ink|monochrome)\b/i,
    classification: "background_output",
    mustPreserve: (d) => [`silhouette and ${d.logoType} structure`],
    mustChange: () => ["render in one ink only"],
    outputMode: "one_color_test",
  },
  {
    test: /\b(spelling|typo|misspell|wrong (text|name)|fix the (name|text))\b/i,
    classification: "text_fix",
    mustPreserve: (d) => ["entire visual concept", "color palette", "icon/mark"],
    mustChange: () => ["render the brand name exactly, no extra letters"],
  },
  {
    test: /\b(more (visible|readable|legible)|name (bigger|larger)|increase (text|wordmark))\b/i,
    classification: "layout_adjustment",
    mustPreserve: (d) => ["icon/mark and color palette"],
    mustChange: () => ["increase wordmark hierarchy and readability without destroying the icon"],
  },
  {
    test: /\b(more refined|cleaner|polish|tighten|less busy|simpler)\b/i,
    classification: "style_refinement",
    mustPreserve: () => ["overall concept and DNA"],
    mustChange: () => ["spacing, balance, line quality, typography polish"],
  },
  {
    test: /\b(less generic|more (custom|unique|ownable|business[- ]specific))\b/i,
    classification: "style_refinement",
    mustPreserve: (d) => [`${d.logoType} direction and palette`],
    mustChange: () => ["make the symbol more business-specific and ownable, less stock"],
  },
  {
    test: /\b(color|hex|palette|hue|tone|shade)\b/i,
    classification: "color_change",
    mustPreserve: () => ["composition, layout, typography, mark"],
    mustChange: () => ["color treatment as requested"],
  },
  {
    test: /\b(layout|alignment|stacked|horizontal|left|right|centered)\b/i,
    classification: "layout_adjustment",
    mustPreserve: () => ["mark, typography style, palette"],
    mustChange: () => ["lockup arrangement only"],
  },
];

export function classifyRevision(args: ClassifyArgs): ClassifiedRevision {
  const text = args.userRequest || "";
  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return {
        classification: rule.classification,
        outputModeOverride: rule.outputMode,
        isFullRedesign: rule.classification === "full_redesign",
        context: {
          parentConceptId: args.parentConceptId,
          parentDnaSnapshot: args.parentDna,
          parentPrompt: args.parentPrompt,
          userRequest: text,
          mustPreserve: rule.mustPreserve ? rule.mustPreserve(args.parentDna) : args.parentDna.mustPreserve,
          mustChange: rule.mustChange ? rule.mustChange() : [],
          classification: rule.classification,
        },
      };
    }
  }
  // Default: minor edit — preserve DNA, change only what user said.
  return {
    classification: "minor_edit",
    isFullRedesign: false,
    context: {
      parentConceptId: args.parentConceptId,
      parentDnaSnapshot: args.parentDna,
      parentPrompt: args.parentPrompt,
      userRequest: text,
      mustPreserve: args.parentDna.mustPreserve,
      mustChange: [text],
      classification: "minor_edit",
    },
  };
}