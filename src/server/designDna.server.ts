import { getAdminClient } from "./phase2.server";

/**
 * AB Design DNA Engine
 *
 * Deterministic creative-direction generator. Given a completed Brand Profile
 * it produces a structured "Design DNA" the AI logo renderer (and human
 * designer) must follow. The output is intentionally opinionated and
 * agency-tier — never generic.
 */

export type DesignDna = {
  brand_personality_direction: {
    archetype: string;
    tone: string;
    keywords: string[];
    do: string[];
    avoid: string[];
  };
  typography_direction: {
    primary_typeface: string;
    primary_typeface_alternatives: string[];
    secondary_typeface: string;
    weight_strategy: string;
    letter_spacing: string;
    case_strategy: string;
    descriptor_style: string;
  };
  monogram_symbol_direction: {
    initials: string;
    container_shape: string;
    construction_notes: string;
    symbol_motifs: string[];
    symbols_to_avoid: string[];
  };
  shape_language: {
    geometry: string;
    corner_treatment: string;
    stroke_strategy: string;
    composition_grid: string;
    avoid: string[];
  };
  color_hierarchy: {
    foundation: { name: string; hex: string };
    secondary: { name: string; hex: string };
    accent: { name: string; hex: string };
    neutral: { name: string; hex: string };
    usage_rules: string[];
    accent_rule: string;
  };
  layout_composition: {
    primary_lockup: string;
    secondary_lockups: string[];
    spacing_system: string;
    clear_space: string;
    optical_alignment: string;
  };
  visual_hierarchy: {
    focal_point: string;
    reading_order: string[];
    contrast_strategy: string;
  };
  production_rules: {
    must: string[];
    must_not: string[];
    minimum_size: string;
    one_color_strategy: string;
    embroidery_strategy: string;
  };
  social_media_adaptability: {
    avatar_strategy: string;
    favicon_strategy: string;
    safe_area: string;
    light_dark_behavior: string;
  };
  brand_kit_readiness: {
    required_versions: string[];
    required_formats: string[];
    deliverable_notes: string[];
  };
  // High-signal one-liner the AI renderer should treat as its north star.
  ab_north_star: string;
};

type Profile = Record<string, unknown>;

function s(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  const t = String(v).trim();
  return t || fallback;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  const str = s(v);
  if (!str) return [];
  return str
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#?[0-9a-f]{6}$/i.test(v.trim());
}

function hex(v: unknown, fallback: string): string {
  if (!isHex(v)) return fallback;
  const t = (v as string).trim();
  return t.startsWith("#") ? t : `#${t}`;
}

function deriveInitials(p: Profile): string {
  const explicit = s(p.initials_abbreviation);
  if (explicit) return explicit.toUpperCase().slice(0, 3);
  const name = s(p.business_name) || "Brand";
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return letters.slice(0, 3) || "AB";
}

function pickArchetype(p: Profile): string {
  const personality = arr(p.brand_personality).map((x) => x.toLowerCase());
  const has = (kw: string) => personality.some((x) => x.includes(kw));
  if (has("luxury") || has("premium") || has("elegant")) return "The Sovereign";
  if (has("trust") || has("expert") || has("consult")) return "The Sage Consultant";
  if (has("bold") || has("disrupt") || has("rebel")) return "The Challenger";
  if (has("warm") || has("care") || has("family")) return "The Caregiver";
  if (has("creative") || has("artist") || has("design")) return "The Creator";
  if (has("modern") || has("clean") || has("minimal")) return "The Modernist";
  return "The Quiet Authority";
}

function pickTypeface(archetype: string, fontPrefs: string[]): {
  primary: string;
  alts: string[];
  secondary: string;
} {
  const prefs = fontPrefs.map((x) => x.toLowerCase()).join(" ");
  if (prefs.includes("serif") || archetype.includes("Sovereign") || archetype.includes("Sage")) {
    return {
      primary: "Editorial serif (Playfair Display, Canela, or DM Serif Display)",
      alts: ["Playfair Display", "Canela", "DM Serif Display"],
      secondary: "Inter or Söhne for descriptors",
    };
  }
  if (prefs.includes("script") || archetype.includes("Caregiver")) {
    return {
      primary: "Refined humanist serif paired with a single script accent",
      alts: ["Cormorant Garamond", "Fraunces"],
      secondary: "Inter for descriptors — no script in body",
    };
  }
  if (archetype.includes("Challenger") || archetype.includes("Modernist")) {
    return {
      primary: "Geometric sans (Söhne, Aktiv Grotesk, or Inter Display)",
      alts: ["Söhne", "Aktiv Grotesk", "Inter Display"],
      secondary: "Inter Mono for technical descriptors",
    };
  }
  if (archetype.includes("Creator")) {
    return {
      primary: "Distinctive display sans with custom letterform tweaks",
      alts: ["Space Grotesk", "General Sans", "Neue Haas Grotesk"],
      secondary: "Inter for body and descriptors",
    };
  }
  return {
    primary: "Confident neo-grotesque sans (Söhne, Inter Display, or Neue Haas Grotesk)",
    alts: ["Söhne", "Inter Display", "Neue Haas Grotesk"],
    secondary: "Inter for descriptors",
  };
}

function pickShapeLanguage(p: Profile, archetype: string) {
  const shapePrefs = arr(p.shape_preferences).map((x) => x.toLowerCase());
  const has = (kw: string) => shapePrefs.some((x) => x.includes(kw));
  if (has("circle") || archetype.includes("Caregiver")) {
    return {
      geometry: "Circular and organic with intentional asymmetry",
      corner_treatment: "Soft radii, no sharp 90° corners on containers",
    };
  }
  if (has("square") || has("rect") || archetype.includes("Modernist")) {
    return {
      geometry: "Strict rectilinear with a single contrasting curve",
      corner_treatment: "Sharp 0–4px radii on containers; no rounded boxes",
    };
  }
  if (archetype.includes("Sovereign") || archetype.includes("Sage")) {
    return {
      geometry: "Editorial geometry — vertical emphasis, tight rectangle proportions",
      corner_treatment: "Hairline rules; sharp corners on containers; no rounded badges",
    };
  }
  return {
    geometry: "Clean geometric forms with one distinctive deviation",
    corner_treatment: "Subtle 2–6px radii on containers only",
  };
}

const AB_FOUNDATION_BLACK = "#0F0F10";
const AB_FOUNDATION_CHARCOAL = "#1F2024";
const AB_RED = "#D6262C";
const AB_NEUTRAL = "#FAFAF7";

function colorHierarchy(p: Profile) {
  const primary = hex(p.primary_hex, AB_FOUNDATION_BLACK);
  const secondary = hex(p.secondary_hex, AB_RED);
  const accent = hex(p.accent_hex, AB_RED);
  const neutral = hex(p.neutral_hex, AB_NEUTRAL);
  return {
    foundation: { name: s(p.primary_color_name, "Foundation"), hex: primary },
    secondary: { name: s(p.secondary_color_name, "Charcoal"), hex: secondary || AB_FOUNDATION_CHARCOAL },
    accent: { name: s(p.accent_color_name, "Signal Red"), hex: accent },
    neutral: { name: s(p.neutral_color_name, "Off-White"), hex: neutral },
    usage_rules: [
      "Foundation color carries the type and primary mark — used at 70%+ of surface ink.",
      "Secondary color used only for structural support (rules, container outlines, descriptors).",
      "Accent color is reserved — never used for the brand name itself.",
      "Neutral is the canvas — always honor a clear, off-white safe area.",
    ],
    accent_rule:
      "Accent appears as ONE intentional detail per lockup (a dot, a stroke, or a single rule) — never as a fill on the wordmark.",
  };
}

function avoidanceList(p: Profile, kind: "fonts" | "shapes" | "symbols" | "styles" | "colors"): string[] {
  const map: Record<string, unknown> = {
    fonts: p.fonts_to_avoid,
    shapes: p.shapes_to_avoid,
    symbols: p.symbols_to_avoid,
    styles: p.styles_to_avoid,
    colors: p.colors_to_avoid,
  };
  return arr(map[kind]);
}

export function buildDesignDna(profile: Profile): DesignDna {
  const archetype = pickArchetype(profile);
  const fontPrefs = arr(profile.font_style_preferences);
  const type = pickTypeface(archetype, fontPrefs);
  const shape = pickShapeLanguage(profile, archetype);
  const colors = colorHierarchy(profile);
  const initials = deriveInitials(profile);
  const businessName = s(profile.business_name, "Your Brand");
  const tagline = s(profile.tagline_ideas);
  const industry = s(profile.industry, "the industry");

  const personalityWords = arr(profile.brand_personality);
  const feeling = s(profile.brand_feeling);
  const descriptor = tagline || industry;

  return {
    brand_personality_direction: {
      archetype,
      tone: feeling || "Confident, quiet, premium — speaks softly, signs precisely.",
      keywords: personalityWords.length ? personalityWords : ["refined", "deliberate", "credible"],
      do: [
        "Signal expertise through restraint, not decoration.",
        "Earn attention with proportion and spacing — not effects.",
        "Treat every glyph and stroke as load-bearing.",
      ],
      avoid: [
        "Trendy effects, gradients, or glow.",
        "Mascots, clip art, or generic industry icons.",
        ...avoidanceList(profile, "styles"),
      ],
    },
    typography_direction: {
      primary_typeface: type.primary,
      primary_typeface_alternatives: type.alts,
      secondary_typeface: type.secondary,
      weight_strategy:
        "Brand name: 600–700. Descriptor: 400–500 letter-spaced. Never use the same weight for both.",
      letter_spacing:
        "Brand name: -2% to -4% (tight). Descriptor: +120 to +200 tracking (open, all-caps).",
      case_strategy:
        "Brand name in mixed case for serif, ALL CAPS for sans. Descriptor always in ALL CAPS, smaller scale.",
      descriptor_style: descriptor
        ? `Descriptor reads "${descriptor}" — set on a single hairline rule beneath the wordmark.`
        : "Descriptor placed on a single hairline rule beneath the wordmark.",
    },
    monogram_symbol_direction: {
      initials,
      container_shape:
        archetype.includes("Sovereign") || archetype.includes("Sage")
          ? "Vertical rectangle, hairline outline — never a filled circle."
          : archetype.includes("Modernist")
            ? "Square with a single corner notch or a 1px hairline."
            : "Restrained square or shield, hairline outline only.",
      construction_notes:
        "Monogram letters share baseline and cap-height with the wordmark. Counter-spaces must remain open at 16px. No interlocking unless the letters demand it structurally.",
      symbol_motifs:
        arr(profile.industry_symbols_to_consider).length > 0
          ? arr(profile.industry_symbols_to_consider)
          : ["a single geometric mark derived from the initials, not from clip art"],
      symbols_to_avoid: [
        ...avoidanceList(profile, "symbols"),
        "stock industry icons",
        "globes, swooshes, generic speech bubbles, ribbons",
      ],
    },
    shape_language: {
      geometry: shape.geometry,
      corner_treatment: shape.corner_treatment,
      stroke_strategy:
        "When strokes appear, they are hairline (1.5–2px optical). Never mix stroke weights inside one mark.",
      composition_grid: "12-column optical grid, 8px base unit — every element snaps to it.",
      avoid: [
        ...avoidanceList(profile, "shapes"),
        "rounded rectangles used as decoration",
        "drop shadows or 3D extrusion",
      ],
    },
    color_hierarchy: colors,
    layout_composition: {
      primary_lockup: `Stacked: monogram or symbol top, "${businessName}" centered below, descriptor on a hairline rule beneath.`,
      secondary_lockups: [
        "Horizontal: symbol left, wordmark right, vertically centered to cap-height.",
        "Stamp: square monogram-only mark for avatars, favicons, and apparel labels.",
      ],
      spacing_system:
        "All vertical spacing in multiples of 8px. Wordmark sits 24px below the symbol at the master size.",
      clear_space:
        "Clear space equals the height of the monogram on every side. No element ever crosses that boundary.",
      optical_alignment:
        "Center optically, not mathematically — round shapes overshoot baselines by ~2%.",
    },
    visual_hierarchy: {
      focal_point: "Monogram or symbol leads. Wordmark anchors. Accent and descriptor recede.",
      reading_order: ["Monogram / symbol", "Brand name", "Accent detail", "Descriptor"],
      contrast_strategy:
        "Drive contrast through scale and weight, not color. Color contrast is reserved for the single accent.",
    },
    production_rules: {
      must: [
        "Outlined paths for every glyph in the final vector.",
        "Single solid fills only — no gradients, no transparency.",
        "Embroidery, vinyl, foil, screen-print, and 1-color reverse versions ship together.",
      ],
      must_not: [
        "No raster images, no shadows, no glow, no filters, no foreignObject, no scripts.",
        "No text smaller than 8pt at 1× output size.",
        "No detail thinner than 1.5px at minimum print size.",
      ],
      minimum_size: "Master mark legible at 24px digital and 0.5\" print.",
      one_color_strategy:
        "One-color version uses the foundation color only — accent disappears, not converted to gray.",
      embroidery_strategy:
        "Simplified version drops the accent rule and any stroke under 2px. Provide a separate stitch-ready file.",
    },
    social_media_adaptability: {
      avatar_strategy:
        "Square monogram-only stamp on the foundation color, off-white letterforms, accent dot reserved.",
      favicon_strategy: "Single-glyph monogram at 32×32 — strip descriptor and accent.",
      safe_area: "Square safe area equal to 80% of the canvas; circular crop must never touch the glyph.",
      light_dark_behavior:
        "On light: foundation ink + reserved accent. On dark: off-white ink + the same accent — never invert the accent.",
    },
    brand_kit_readiness: {
      required_versions: arr(profile.logo_version_needs).length
        ? arr(profile.logo_version_needs)
        : [
            "Primary stacked lockup",
            "Horizontal lockup",
            "Square stamp / avatar",
            "Monogram-only mark",
            "One-color version",
            "Reverse (white-on-dark) version",
          ],
      required_formats: arr(profile.required_file_formats).length
        ? arr(profile.required_file_formats)
        : ["SVG", "PDF", "EPS", "PNG (transparent)", "JPG"],
      deliverable_notes: [
        "Every file labeled with brand-name-version-color (e.g. brand-stacked-foundation.svg).",
        "Master vector ships with all paths outlined and a documented clear-space rule.",
        "Embroidery-ready file ships separately with stitch-friendly simplifications.",
      ],
    },
    ab_north_star: `${archetype} for ${businessName}: refined ${type.alts[0] || "type"} with a precise ${initials} monogram, charcoal & black foundation, a single ${colors.accent.name.toLowerCase()} accent detail, and a clean descriptor beneath. Built to print, stitch, cut, scale, and save cleanly as vector — nothing else.`,
  };
}

export async function generateAndSaveDesignDna(brandProfileId: string) {
  const sb = getAdminClient();
  const { data: profile, error } = await sb
    .from("brand_profiles")
    .select("*")
    .eq("id", brandProfileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Brand profile not found");

  const dna = buildDesignDna(profile as Profile);
  const generatedAt = new Date().toISOString();

  const { error: updateErr } = await sb
    .from("brand_profiles")
    .update({
      design_dna: dna as unknown as never,
      design_dna_generated_at: generatedAt,
    } as never)
    .eq("id", brandProfileId);
  if (updateErr) throw new Error(updateErr.message);

  return { design_dna: dna, generated_at: generatedAt };
}