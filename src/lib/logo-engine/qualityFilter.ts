/**
 * Quality Filter — the GATEKEEPER.
 *
 * Scores a generated logo against the Anaglyph Diamond Standard and decides
 * whether it can be presented to a paying client. If the model is unavailable,
 * we degrade to a conservative heuristic that returns `needs_revision`.
 *
 * Returns a `QualityReport` with:
 *   - per-criterion breakdown (1-10)
 *   - overall score
 *   - decision: approved | needs_revision | rejected
 *   - notes (reasons)
 *   - improvementHints (regeneration guidance for the prompt compiler)
 */

import type {
  CompiledPrompt,
  DesignDnaStrategy,
  QualityBreakdown,
  QualityDecision,
  QualityReport,
} from "./types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const VISION_MODEL = "google/gemini-2.5-pro";

const APPROVE_THRESHOLD = 8.0;
const REJECT_THRESHOLD = 6.5;

const SCORE_KEYS: (keyof QualityBreakdown)[] = [
  "strategicFit",
  "readability",
  "typographyQuality",
  "simplicity",
  "memorability",
  "productionReadiness",
  "vectorReadiness",
  "oneColorStrength",
  "safeSpaceLayout",
  "professionalPolish",
];

const SCORE_SCHEMA = {
  type: "object",
  properties: {
    strategicFit: { type: "number" },
    readability: { type: "number" },
    typographyQuality: { type: "number" },
    simplicity: { type: "number" },
    memorability: { type: "number" },
    productionReadiness: { type: "number" },
    vectorReadiness: { type: "number" },
    oneColorStrength: { type: "number" },
    safeSpaceLayout: { type: "number" },
    professionalPolish: { type: "number" },
    notes: { type: "array", items: { type: "string" } },
    improvementHints: { type: "array", items: { type: "string" } },
    obviousFailures: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "misspelled",
          "generic",
          "too_busy",
          "unreadable_text",
          "looks_like_clipart",
          "wrong_industry",
          "fails_production",
          "fake_letters",
        ],
      },
    },
  },
  required: [...SCORE_KEYS, "notes", "improvementHints", "obviousFailures"],
  additionalProperties: false,
} as const;

function clamp10(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

function average(b: QualityBreakdown): number {
  const sum = SCORE_KEYS.reduce((acc, k) => acc + b[k], 0);
  return Math.round((sum / SCORE_KEYS.length) * 10) / 10;
}

function decide(score: number, hardFailures: string[]): QualityDecision {
  if (hardFailures.length) return "rejected";
  if (score >= APPROVE_THRESHOLD) return "approved";
  if (score >= REJECT_THRESHOLD) return "needs_revision";
  return "rejected";
}

function neutralReport(reason: string): QualityReport {
  const breakdown: QualityBreakdown = {
    strategicFit: 7,
    readability: 7,
    typographyQuality: 7,
    simplicity: 7,
    memorability: 7,
    productionReadiness: 7,
    vectorReadiness: 7,
    oneColorStrength: 7,
    safeSpaceLayout: 7,
    professionalPolish: 7,
  };
  return {
    breakdown,
    overallScore: 7,
    decision: "needs_revision",
    notes: [reason],
    improvementHints: ["Inspect the rendering manually before presenting."],
  };
}

export async function evaluateLogo(args: {
  imageUrl: string;
  prompt: CompiledPrompt;
  dna: DesignDnaStrategy;
}): Promise<QualityReport> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return neutralReport("Quality model unavailable — manual review required.");

  const sys = `You are the Quality Director at Anaglyph Branding. Judge the supplied logo image against the Diamond Standard:
1. Fits the business strategy
2. Looks trustworthy and established
3. Readable typography
4. Disciplined color, works in one color
5. Vector-ready, simple silhouette
6. Works on apparel, signage, business cards, social media
7. Adequate safe space, balanced layout
8. Avoids generic design clichés
9. Looks like real brand-studio work, not a quick AI logo

Score each metric 1-10. List concrete failures and improvementHints that a prompt engineer can act on. If you see misspelled text, fake letters, clipart, mockup scenes, or famous-brand imitation — flag it via obviousFailures. Always respond by calling return_quality_score.`;

  const userText = `Brand: ${args.dna.businessName}
Industry: ${args.dna.industry}
Logo type: ${args.prompt.markType}
Output mode: ${args.prompt.outputMode}
Exact text required: "${args.dna.exactLogoText}"
Must avoid: ${args.dna.mustAvoid.join("; ") || "—"}

Judge this rendering.`;

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: args.imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_quality_score",
              description: "Return diamond-standard quality scores for a logo rendering.",
              parameters: SCORE_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_quality_score" } },
      }),
    });
    if (!res.ok) return neutralReport(`Quality model error ${res.status}.`);
    const json = await res.json();
    const argsStr = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return neutralReport("Quality model returned no structured score.");
    const parsed = JSON.parse(argsStr) as Record<string, unknown> & {
      notes: string[];
      improvementHints: string[];
      obviousFailures: string[];
    };

    const breakdown = SCORE_KEYS.reduce((acc, k) => {
      acc[k] = clamp10(parsed[k]);
      return acc;
    }, {} as QualityBreakdown);
    const overall = average(breakdown);
    const hardFailures = Array.isArray(parsed.obviousFailures) ? parsed.obviousFailures : [];
    const decision = decide(overall, hardFailures);

    return {
      breakdown,
      overallScore: overall,
      decision,
      notes: [...(parsed.notes || []), ...hardFailures.map((f) => `Hard failure: ${f}`)],
      improvementHints: parsed.improvementHints || [],
    };
  } catch (e) {
    return neutralReport(e instanceof Error ? e.message : "Quality evaluation failed.");
  }
}

export const QUALITY_THRESHOLDS = {
  approve: APPROVE_THRESHOLD,
  reject: REJECT_THRESHOLD,
};