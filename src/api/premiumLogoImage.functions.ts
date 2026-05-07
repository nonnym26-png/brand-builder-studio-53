import { createServerFn } from "@tanstack/react-start";

type MarkType = "wordmark" | "lettermark" | "monogram" | "emblem" | "combination" | "abstract" | "mascot";

function buildComposition(markType: MarkType | undefined, brandName: string, initial: string, descriptor: string, primary: string, accent: string, neutral: string) {
  const upper = brandName.toUpperCase();
  switch (markType) {
    case "mascot":
      return `COMPOSITION (mascot lockup, top to bottom):
1. A friendly, approachable cartoon-style MASCOT illustration that fits the brand category — expressive face, confident stance, polished vector look (think professional sports / pet brand / family-business mascot quality). Use ${primary} and ${accent} as the dominant fills with ${neutral} for shading and outlines. Crisp black outlines, flat shading, NO photorealism, NO 3D, NO airbrush.
2. A bold, slightly condensed display wordmark "${upper}" set on TWO LINES if the name has two strong words — first word in ${primary}, second word in ${accent} — with a thick dark outline and subtle highlight for that classic mascot-logo "sticker" feel. Tight letter spacing, strong serif or chunky slab.
3. ${descriptor ? `A small ALL-CAPS descriptor "${descriptor}" in ${neutral} centered below the wordmark, flanked by short hairline rules in ${accent}.` : ""}
4. Optional supporting accent (paw, star, heart, shield, ribbon) in ${accent} that complements but does NOT crowd the mascot.

REFERENCE FEEL: high-quality vector mascot logos used by pet daycares, youth sports teams, craft breweries, family restaurants — playful, trustworthy, instantly recognizable.`;
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

BRAND: "${data.brandName}"
${descriptor ? `DESCRIPTOR: "${descriptor}"` : ""}
MARK TYPE: ${data.markType || "combination"}

${composition}

UNIVERSAL RULES:
- Pure white background. No scenes, no mockups, no shadows under the logo.
- Vector-clean appearance: flat solid fills, crisp edges, scalable. NO gradients, NO photographic textures, NO 3D bevels, NO glow.
- Restricted palette: ${primary}, ${accent}, ${neutral}, plus white. No other colors unless the mark type explicitly calls for shading (mascot only).
- Strong negative space. Optical balance. Master-level kerning.
- Centered composition with breathing room on all four sides — NOTHING touches the edges.
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
