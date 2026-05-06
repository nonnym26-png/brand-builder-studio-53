import { createServerFn } from "@tanstack/react-start";

/**
 * Generate a high-fidelity premium logo IMAGE (raster) for a brand profile
 * using the Lovable AI Gateway image model. Returns a data URL the client
 * can render or download.
 *
 * Use this when an SVG render won't capture the artistry the user wants
 * (custom monograms, intersecting ribbons, refined serif wordmarks).
 */
export const generatePremiumLogoImage = createServerFn({ method: "POST" })
  .inputValidator((input: {
    brandName: string;
    initial?: string;
    descriptor?: string;
    primaryHex?: string;
    accentHex?: string;
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

    const prompt = `Design a premium agency-grade brand logo on a clean pure white background — Pentagram / Collins / Chermayeff & Geismar caliber.

BRAND: "${data.brandName}"
${descriptor ? `DESCRIPTOR: "${descriptor}"` : ""}

COMPOSITION (mandatory, top to bottom):
1. A bespoke custom-drawn monogram of the letter "${initial}" — NOT a generic system font glyph. Architectural, tapered terminals, refined apex, considered counter-shape. Color: ${primary} (deep neutral). The letterform itself should feel sculpted and intentional.
2. A single sweeping calligraphic ribbon/swoosh in ${accent} that crosses through the monogram with deliberate intersection — like a brushstroke or upstroke — adding motion without clutter. The ribbon should be elegant, tapered at both ends, and feel hand-considered.
3. The wordmark "${data.brandName.toUpperCase()}" set in a high-contrast classical serif (Trajan / Cinzel feel) in ALL CAPS with wide, generous letter spacing. Color: ${accent}. Optically balanced kerning.
4. ${descriptor ? `A hairline horizontal rule in ${accent}, then the descriptor "${descriptor}" in a clean small ALL-CAPS sans-serif in ${primary}, then another hairline horizontal rule in ${accent}. Format: rule — gap — word — gap — rule. Wide controlled tracking on the descriptor.` : "Skip the descriptor row."}

RULES:
- Two-color palette ONLY: ${primary} and ${accent}. Pure white background. No other colors.
- No gradients, no shadows, no glows, no bevels, no 3D, no photographic textures, no busy backgrounds.
- Strong negative space. The logo must breathe.
- Vector-clean appearance — flat solid fills, crisp edges, scalable feeling.
- Sophisticated, restrained, premium. Nothing cartoonish, generic, or template-y.
- Output should look like a finished agency presentation board lockup — centered composition with generous margin on all sides.

${data.extraDirection ? `Additional direction: ${data.extraDirection}` : ""}`;

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