import type { LogoConcept, MarkType, ProfileLite, SymbolKey } from "./conceptTypes";

const FONT_LIBRARY = {
  modern: { family: "'Inter', sans-serif", weight: 700, ls: -0.01, upper: false },
  geometric: { family: "'Space Grotesk', sans-serif", weight: 700, ls: -0.005, upper: false },
  editorial: { family: "'Playfair Display', serif", weight: 700, ls: 0, upper: false },
  classic: { family: "'Cormorant Garamond', serif", weight: 600, ls: 0.02, upper: true },
  display: { family: "'DM Serif Display', serif", weight: 400, ls: 0, upper: false },
  industrial: { family: "'Space Grotesk', sans-serif", weight: 700, ls: 0.18, upper: true },
  technical: { family: "'JetBrains Mono', monospace", weight: 700, ls: 0.05, upper: true },
};

type FontKind = keyof typeof FONT_LIBRARY;

const INDUSTRY_SYMBOLS: Record<string, SymbolKey[]> = {
  fitness: ["bolt", "flame", "pulse", "abstract-arc"],
  health: ["pulse", "stethoscope", "leaf", "shield"],
  medical: ["pulse", "stethoscope", "shield", "molecule"],
  food: ["fork-knife", "leaf", "flame", "wave"],
  restaurant: ["fork-knife", "flame", "leaf"],
  cafe: ["leaf", "flame", "wave"],
  construction: ["tools", "wrench", "house", "shield"],
  contractor: ["tools", "wrench", "house", "shield"],
  realestate: ["house", "key", "shield", "diamond-cut"],
  realtor: ["house", "key", "diamond-cut"],
  automotive: ["wrench", "gear", "bolt", "shield"],
  outdoor: ["mountain", "tree", "compass", "sun"],
  adventure: ["mountain", "compass", "wing"],
  marine: ["anchor", "wave", "compass"],
  beauty: ["scissors", "diamond-cut", "leaf"],
  salon: ["scissors", "diamond-cut"],
  fashion: ["needle", "scissors", "diamond-cut"],
  tech: ["circuit", "code", "hex-grid", "abstract-orbit"],
  software: ["code", "circuit", "abstract-prism"],
  saas: ["abstract-prism", "abstract-orbit", "hex-grid"],
  finance: ["shield", "diamond-cut", "abstract-prism"],
  consulting: ["compass", "abstract-prism", "diamond-cut"],
  education: ["book", "tree", "sun"],
  pet: ["paw", "wing"],
  veterinary: ["paw", "pulse", "shield"],
  photography: ["camera", "abstract-prism"],
  energy: ["bolt", "sun", "flame"],
  cleaning: ["wave", "leaf", "sun"],
  legal: ["shield", "book", "diamond-cut"],
  default: ["abstract-arc", "diamond-cut", "hex-grid", "abstract-orbit", "abstract-prism"],
};

const PERSONALITY_FONT: Record<string, FontKind> = {
  modern: "modern",
  bold: "industrial",
  strong: "industrial",
  premium: "editorial",
  luxury: "editorial",
  elegant: "classic",
  refined: "classic",
  playful: "geometric",
  friendly: "geometric",
  warm: "display",
  trustworthy: "modern",
  professional: "modern",
  technical: "technical",
  innovative: "geometric",
  natural: "display",
  rustic: "display",
  artisan: "classic",
  minimal: "modern",
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function isHex(s?: string | null): s is string {
  return !!s && /^#?[0-9a-f]{6}$/i.test(s.trim());
}
function norm(h: string) { return h.startsWith("#") ? h : `#${h}`; }

function classifyIndustry(industry?: string | null): keyof typeof INDUSTRY_SYMBOLS {
  const t = (industry || "").toLowerCase();
  for (const k of Object.keys(INDUSTRY_SYMBOLS)) {
    if (k !== "default" && t.includes(k)) return k as keyof typeof INDUSTRY_SYMBOLS;
  }
  if (t.includes("real estate") || t.includes("property")) return "realestate";
  if (t.includes("dental") || t.includes("clinic")) return "medical";
  if (t.includes("auto") || t.includes("car")) return "automotive";
  if (t.includes("law") || t.includes("attorney")) return "legal";
  return "default";
}

function pickFontFromPersonality(personality: string[] | null | undefined, fallback: FontKind): FontKind {
  const p = (personality || []).map((x) => x.toLowerCase());
  for (const word of p) {
    for (const k of Object.keys(PERSONALITY_FONT)) {
      if (word.includes(k)) return PERSONALITY_FONT[k];
    }
  }
  return fallback;
}

function buildPalette(profile: ProfileLite): LogoConcept["palette"] {
  const primary = isHex(profile.primary_hex) ? norm(profile.primary_hex!) : "#D6262C";
  const secondary = isHex(profile.secondary_hex) ? norm(profile.secondary_hex!) : "#2BA8E0";
  const accent = isHex(profile.accent_hex) ? norm(profile.accent_hex!) : secondary;
  const dark = isHex(profile.neutral_hex) ? norm(profile.neutral_hex!) : "#0F0F10";
  return { name: "Brand", primary, secondary, accent, dark, light: "#FFFFFF" };
}

/**
 * Deterministic concept generation based on the brand profile.
 * Returns 6 distinct strategic directions covering the spectrum.
 */
export function generateConcepts(profile: ProfileLite): LogoConcept[] {
  const brand = (profile.business_name || "Your Brand").trim();
  const initials =
    (profile.initials_abbreviation || brand.split(/\s+/).map((w) => w[0]).join("").slice(0, 3) || "AB").toUpperCase();
  const palette = buildPalette(profile);
  const industryKey = classifyIndustry(profile.industry);
  const symbols = INDUSTRY_SYMBOLS[industryKey];
  const seed = hashStr(brand + (profile.industry || ""));
  const tagline = (profile.tagline_ideas || "").split(/[,\n]/)[0]?.trim() || "";

  const baseFont = pickFontFromPersonality(profile.brand_personality, "modern");

  const directions: Array<Partial<LogoConcept> & {
    name: string;
    markType: MarkType;
    geometry: LogoConcept["geometry"];
    cornerStyle: LogoConcept["cornerStyle"];
    strokeStyle: LogoConcept["strokeStyle"];
    layout: LogoConcept["layout"];
    fontKind: FontKind;
    symbol: SymbolKey;
    container?: LogoConcept["containerShape"];
    rationaleSeed: string;
    moodWords: string[];
    usage: string;
  }> = [
    {
      name: "The Signature",
      markType: "wordmark",
      geometry: "editorial",
      cornerStyle: "sharp",
      strokeStyle: "filled",
      layout: "wordmark",
      fontKind: "editorial",
      symbol: "none",
      rationaleSeed: "A pure typographic wordmark — confidence and authority without ornament. Best when the name itself carries the brand.",
      moodWords: ["editorial", "confident", "premium"],
      usage: "Strong on letterhead, headers, and large surfaces. Pair with photography.",
    },
    {
      name: "The Mark + Wordmark",
      markType: "combination",
      geometry: "geometric",
      cornerStyle: "soft",
      strokeStyle: "filled",
      layout: "icon-left",
      fontKind: baseFont,
      symbol: pick(symbols, seed),
      rationaleSeed: "Symbol-anchored combination — the most flexible system. Lockup + standalone icon for app icons, favicons and social.",
      moodWords: ["versatile", "modern", "system-driven"],
      usage: "Use lockup for headers; standalone icon for avatars, favicons, embroidery.",
    },
    {
      name: "The Monogram",
      markType: "monogram",
      geometry: "geometric",
      cornerStyle: "round",
      strokeStyle: "filled",
      layout: "monogram",
      fontKind: "geometric",
      symbol: "none",
      container: "circle",
      rationaleSeed: "Initial-driven mark inside a contained geometry. Reads instantly at small scale and works as a stamp.",
      moodWords: ["disciplined", "iconic", "ownable"],
      usage: "Best for app icons, social avatars, and stamps. Works one-color.",
    },
    {
      name: "The Emblem",
      markType: "emblem",
      geometry: "industrial",
      cornerStyle: "sharp",
      strokeStyle: "outlined",
      layout: "emblem",
      fontKind: "industrial",
      symbol: pick(symbols, seed + 2),
      container: "shield",
      rationaleSeed: "Heritage-style badge — symbol locked into a container with type. Communicates craft, history, trust.",
      moodWords: ["heritage", "crafted", "trusted"],
      usage: "Strong for packaging, merch, signage. Use the wordmark version for digital headers.",
    },
    {
      name: "The Abstract",
      markType: "abstract",
      geometry: "geometric",
      cornerStyle: "soft",
      strokeStyle: "duotone",
      layout: "icon-top",
      fontKind: "modern",
      symbol: pick(["abstract-arc", "abstract-orbit", "abstract-prism", "hex-grid", "diamond-cut"] as SymbolKey[], seed + 3),
      rationaleSeed: "Abstract geometric mark — meaning is built, not borrowed. Stands apart from category clichés.",
      moodWords: ["distinctive", "ownable", "forward"],
      usage: "Pair with strong type. Excellent in motion and digital environments.",
    },
    {
      name: "The Mascot",
      markType: "mascot",
      geometry: "playful",
      cornerStyle: "round",
      strokeStyle: "filled",
      layout: "icon-top",
      fontKind: "geometric",
      symbol: pick(symbols, seed + 5),
      rationaleSeed: "Symbol-led mark with personality — a memorable visual hook that customers attach emotion to.",
      moodWords: ["warm", "human", "memorable"],
      usage: "Excellent for social, packaging and consumer-facing surfaces.",
    },
  ];

  return directions.map((d, i): LogoConcept => {
    const f = FONT_LIBRARY[d.fontKind];
    return {
      id: `c${i + 1}`,
      name: d.name,
      tagline: tagline || d.moodWords.slice(0, 2).join(" · "),
      rationale: composeRationale(d.rationaleSeed, profile),
      markType: d.markType,
      symbol: d.symbol,
      layout: d.layout,
      geometry: d.geometry,
      cornerStyle: d.cornerStyle,
      strokeStyle: d.strokeStyle,
      initials,
      brandName: brand,
      containerShape: d.container ?? "none",
      headingFont: f.family,
      headingWeight: f.weight,
      letterSpacing: f.ls,
      uppercase: f.upper,
      palette,
      moodWords: d.moodWords,
      usageNotes: d.usage,
    };
  });
}

function composeRationale(seed: string, profile: ProfileLite): string {
  const bits: string[] = [seed];
  if (profile.business_differentiator) {
    bits.push(`Reinforces "${profile.business_differentiator.slice(0, 120)}".`);
  }
  if (profile.brand_feeling) {
    bits.push(`Tone: ${profile.brand_feeling}.`);
  }
  return bits.join(" ");
}

/** Merge AI-supplied directions on top of deterministic ones (AI provides name/rationale/tagline/mood; renderer parameters are still deterministic). */
export function mergeAIDirections(
  base: LogoConcept[],
  ai?: Array<{ id?: string; name?: string; tagline?: string; rationale?: string; moodWords?: string[]; usageNotes?: string }>,
): LogoConcept[] {
  if (!ai || !ai.length) return base;
  return base.map((c, i) => {
    const a = ai[i];
    if (!a) return c;
    return {
      ...c,
      name: a.name || c.name,
      tagline: a.tagline ?? c.tagline,
      rationale: a.rationale || c.rationale,
      moodWords: a.moodWords?.length ? a.moodWords : c.moodWords,
      usageNotes: a.usageNotes || c.usageNotes,
    };
  });
}