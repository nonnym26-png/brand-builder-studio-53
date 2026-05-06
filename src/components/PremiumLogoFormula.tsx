import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export const PREMIUM_LOGO_FORMULA = [
  {
    title: "A strong primary mark",
    detail: "Monogram, symbol, badge, or refined wordmark — pick one and commit.",
  },
  {
    title: "A readable wordmark",
    detail: "The business name must be clear, balanced, and confident at any size.",
  },
  {
    title: "A secondary descriptor",
    detail:
      "If applicable, use CONSULTING, SERVICES, STUDIO, GROUP, etc. with controlled letter spacing.",
  },
  {
    title: "A restrained accent",
    detail:
      "Use the accent color sparingly: a dot, underline, swoosh, separator, or monogram detail.",
  },
  {
    title: "Strong spacing",
    detail: "The logo must breathe. Avoid crowding any element.",
  },
  {
    title: "Clear hierarchy",
    detail: "The viewer should know exactly what to read first.",
  },
  {
    title: "Scalable geometry",
    detail: "The design must work from favicon to billboard.",
  },
  {
    title: "Simple color system",
    detail: "Use 1–3 solid colors maximum.",
  },
  {
    title: "No cheap effects",
    detail: "No gradients, shadows, bevels, glows, photos, or busy backgrounds.",
  },
  {
    title: "Variation-ready",
    detail:
      "Must support icon-only, wordmark, stacked, horizontal, black, white, and one-color versions.",
  },
] as const;

export const PREMIUM_LOGO_FORMULA_PROMPT = `PREMIUM LOGO FORMULA — every rendering MUST satisfy all 10 rules:
${PREMIUM_LOGO_FORMULA.map((r, i) => `${i + 1}. ${r.title} — ${r.detail}`).join("\n")}`;

export function PremiumLogoFormulaCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Premium Logo Formula
          </CardTitle>
          <Badge variant="outline">10 rules</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Every professional logo rendering should consider these ten foundations.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PREMIUM_LOGO_FORMULA.map((rule, i) => (
          <div key={rule.title} className="rounded-md border border-border p-3">
            <div className="flex items-start gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-sm font-medium">{rule.title}</div>
                <div className="text-xs text-muted-foreground">{rule.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}