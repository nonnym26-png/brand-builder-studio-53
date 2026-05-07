import { createServerFn } from "@tanstack/react-start";

type MarkType = "wordmark" | "lettermark" | "monogram" | "emblem" | "combination" | "abstract" | "mascot";

const DESIGN_DNA = `ANAGLYPH BRANDING — PROFESSIONAL LOGO ENGINE (must follow on EVERY render):
MUST HAVE: clear readability · balanced composition · limited color palette · strong contrast · clean typography · memorable icon or mascot · real-world usability · vector-friendly shapes.
AVOID: generic clipart · busy backgrounds · thin lines · unreadable fonts · too many colors · too many symbols · overly detailed illustrations · mockup scenes · distorted text · misspelled words · aggressive mascot · scary teeth · messy shadows · photo-realistic rendering · watermarks · random shapes · unbalanced spacing · childish clipart.
QUALITY BAR (every metric ≥ 8/10): readability · originality · color balance · professional polish · print readiness · brand fit.
FORMULA: strong symbol + clean typography + limited color palette + balanced layout + real-world usability.
OUTPUT: pure white background · centered composition · generous margins · crisp vector look · bold confident outlines · flat color or simple cel shading only · suitable for signage, shirts, embroidery, business cards, website, decals, social media.`;

function buildComposition(markType: MarkType | undefined, brandName: string, initial: string, descriptor: string, primary: string, accent: string, neutral: string) {
  const upper = brandName.toUpperCase();
  const words = brandName.trim().split(/\s+/);
  const w1 = (words[0] || brandName).toUpperCase();
  const w2 = (words.slice(1).join(" ") || "").toUpperCase();
  switch (markType) {
    case "mascot":
      return `COMPOSITION (professional mascot lockup, top → bottom):
1. CONTAINER FRAME — a single bold simple architectural shape behind the mascot in ${primary} (e.g. peaked house roof, shield, arch, banner) that frames the character and communicates the brand category. Thick clean outline, flat fill or open silhouette. Must NOT crowd the mascot.
2. MASCOT — a friendly, expressive, vector-style cartoon character that fits the brand industry. Approachable, confident, trustworthy — NEVER aggressive, NO bared teeth, NO scary expression. Soft rounded forms with bold confident black outlines (~3–5px equivalent). Simple cel shading only — flat base color + ONE shadow tone + ONE highlight. Use ${neutral} and white for the character body, ${primary}/${accent} for accessories (collar, tag, scarf, hat, jersey, etc.). Eyes friendly and large. Mouth subtle smile.
3. ACCENT ELEMENT — exactly ONE small supporting pet/category icon in ${accent} (paw print, heart with paw, bone tag, star, leaf, etc.) floating beside the mascot for personality. Never more than one.
4. WORDMARK — set "${w1}"${w2 ? ` and "${w2}"` : ""} in a LARGE BOLD ROUNDED slab-serif or chunky display face with thick black outlines and a subtle white inner highlight (classic mascot "sticker" feel). ${w2 ? `Color split: "${w1}" in ${primary}, "${w2}" in ${accent}.` : `Color: ${primary} with ${accent} accent on one letter.`} Tight kerning, optical balance, NOTHING distorted, NO misspellings.
5. ${descriptor ? `DESCRIPTOR ROW — small ALL-CAPS sans-serif "${descriptor}" in ${neutral} below the wordmark, wide tracking, flanked by short hairline rules in ${primary}, with a tiny ${primary} accent dot or paw centered below.` : `Skip the descriptor row.`}

TYPE PLACEMENT: every glyph perfectly aligned, correctly spelled, no overlap with the mascot, generous breathing room.
REFERENCE FEEL: agency-grade vector mascot logos used by pet daycares, youth sports teams, craft breweries, family restaurants — playful, trustworthy, instantly recognizable, print-ready at any size.`;
    case "emblem":
      return `COMPOSITION (heritage emblem):
1. A circular or shield emblem badge with concentric rings of typography. Outer ring: "${upper}" in ALL CAPS curved along the top arc, ${descriptor ? `"${descriptor}" curved along the bottom arc,` : ""} small star/dot separators on the sides.
2. Inside: a strong central icon or monogram of "${initial}" in ${primary}, framed by hairline rules.
3. Two-tone fill: ${primary} on ${accent === "#FFFFFF" ? "white" : accent} with crisp inner stroke. Heritage / craft / lodge feel.`;
    case "lettermark":
    case "monogram":
      return `COMPOSITION (custom monogram lockup):
1. A bespoke custom-drawn monogram of "${initial}" in ${primary} — architectural, refined terminals, considered counter-shape. NOT a system font glyph.
2. A single elegant ${accent} accent stroke or geometric counter-shape that intersects the monogram with intent.
3. Wordmark "${upper}" below in a high-contrast classical serif (Trajan / Cinzel feel), ALL CAPS, generous tracking, in ${accent}.
4. ${descriptor ? `Hairline rule in ${accent} — descriptor "${descriptor}" in ALL-CAPS sans in ${primary} — hairline rule in ${accent}.` : ""}`;
    case "wordmark":
      return `COMPOSITION (pure wordmark):
1. The wordmark "${upper}" rendered as a custom-drawn typographic logotype in ${primary} — bespoke letterform details, considered ligatures, optical kerning. Could be a confident sans, an editorial serif, or a refined script — pick what suits the brand.
2. A single ${accent} accent (underline, dot, swash, color-swap on one letter) that signs the mark.
3. ${descriptor ? `Below: hairline rule — "${descriptor}" in small ALL-CAPS — hairline rule, all in ${accent}/${primary}.` : ""}`;
    case "combination":
    case "abstract":
    default:
      return `COMPOSITION (combination mark):
1. A clean geometric or abstract symbol in ${primary} with a single ${accent} accent — flat vector, distinctive silhouette, scalable to favicon size.
2. To the right (or below) the symbol: wordmark "${upper}" in a confident contemporary typeface in ${primary}, optically kerned.
3. Vertical hairline rule in ${accent} separating symbol and wordmark (only if side-by-side layout).
4. ${descriptor ? `Small ALL-CAPS descriptor "${descriptor}" in ${neutral} below the wordmark with wide tracking.` : ""}`;
  }
}

export const generatePremiumLogoImage = createServerFn({ method: "POST" })
  .inputValidator((input: {
    brandName: string;
    initial?: string;
    descriptor?: string;
    primaryHex?: string;
    accentHex?: string;
    neutralHex?: string;
    markType?: MarkType;
    extraDirection?: string;
    model?: "google/gemini-2.5-flash-image" | "google/gemini-3-pro-image-preview" | "google/gemini-3.1-flash-image-preview";
  }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway is not configured.");

    const initial = (data.initial || data.brandName.charAt(0)).toUpperCase();
    const descriptor = (data.descriptor || "").toUpperCase();
    const primary = data.primaryHex || "#0F0F10";
    const accent = data.accentHex || "#B81F2A";
    const neutral = data.neutralHex || "#3A3A3A";
    const composition = buildComposition(data.markType, data.brandName, initial, descriptor, primary, accent, neutral);

    const prompt = `Design a premium, agency-grade brand logo on a clean pure white background. The output must look like a finished professional logo presentation — crisp, vector-clean, perfectly centered, generous margins.

${DESIGN_DNA}

BRAND: "${data.brandName}"
${descriptor ? `DESCRIPTOR: "${descriptor}"` : ""}
MARK TYPE: ${data.markType || "combination"}

${composition}

UNIVERSAL RULES:
- Pure white background. No scenes, no mockups, no shadows under the logo.
- Vector-clean appearance: flat solid fills, crisp edges, scalable. NO gradients, NO photographic textures, NO 3D bevels, NO glow.
- Restricted palette: ${primary}, ${accent}, ${neutral}, plus white and a single neutral grey for shading. NO other colors.
- Strong negative space. Optical balance. Master-level kerning.
- Centered composition with breathing room on all four sides — NOTHING touches the edges.
- Spell every word EXACTLY as written. Do not add, drop, or rearrange letters.
- Output should look like an agency lockup ready for shirts, signage, business cards.

${data.extraDirection ? `ADDITIONAL DIRECTION FROM SELECTED CONCEPT: ${data.extraDirection}` : ""}`;

    const body = {
      model: data.model || "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      const txt = await resp.text().catch(() => "");
      throw new Error(`AI gateway error (${resp.status}) ${txt.slice(0, 200)}`);
    }
    const json = await resp.json();
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("AI returned no image.");
    return { imageUrl: url as string };
  });
