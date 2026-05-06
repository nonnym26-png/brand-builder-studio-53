import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const DIAMOND_CATEGORIES = [
  "brand_strategy_fit",
  "visual_balance",
  "typography_quality",
  "shape_strength",
  "color_strength",
  "vector_readiness",
  "one_color_strength",
  "embroidery_readiness",
  "signage_readiness",
  "social_media_readiness",
  "apparel_readiness",
  "professional_polish",
] as const;

export type DiamondCategoryKey = (typeof DIAMOND_CATEGORIES)[number];

export type DiamondScores = Partial<Record<DiamondCategoryKey, number>>;

const LABELS: Record<DiamondCategoryKey, string> = {
  brand_strategy_fit: "Brand Strategy Fit",
  visual_balance: "Visual Balance",
  typography_quality: "Typography Quality",
  shape_strength: "Shape Strength",
  color_strength: "Color Strength",
  vector_readiness: "Vector Readiness",
  one_color_strength: "One-Color Strength",
  embroidery_readiness: "Embroidery Readiness",
  signage_readiness: "Signage Readiness",
  social_media_readiness: "Social Media Readiness",
  apparel_readiness: "Apparel Readiness",
  professional_polish: "Professional Polish",
};

function clamp10(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

export function computeOverall(scores: DiamondScores): number {
  const vals = DIAMOND_CATEGORIES.map((k) => clamp10(scores[k])).filter((v) => v > 0);
  if (!vals.length) return 0;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}

export function diamondVerdict(overall: number): {
  label: string;
  tone: "success" | "warning" | "info" | "danger";
} {
  if (overall >= 9) return { label: "Strong AB Presentation Candidate", tone: "success" };
  if (overall >= 8) return { label: "Good Direction — Review Carefully", tone: "info" };
  if (overall >= 7) return { label: "Needs Refinement", tone: "warning" };
  return { label: "Not Ready for AB Presentation", tone: "danger" };
}

const TONE_CLASS: Record<"success" | "warning" | "info" | "danger", string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function DiamondScoreBadge({ overall }: { overall: number }) {
  const { tone } = diamondVerdict(overall);
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "info"
        ? "bg-sky-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-rose-500";
  return (
    <div className="flex flex-col items-end">
      <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${TONE_CLASS[tone]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-xs font-semibold tabular-nums">
          Diamond Score: {overall.toFixed(1)} / 10
        </span>
      </div>
    </div>
  );
}

export function DiamondScorePanel({
  scores,
  compact = false,
}: {
  scores: DiamondScores;
  compact?: boolean;
}) {
  const overall = computeOverall(scores);
  const verdict = diamondVerdict(overall);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className={TONE_CLASS[verdict.tone]}>
          {verdict.label}
        </Badge>
        <span className="text-xs font-semibold tabular-nums">
          Diamond Score: {overall.toFixed(1)} / 10
        </span>
      </div>
      {!compact && (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {DIAMOND_CATEGORIES.map((k) => {
            const v = clamp10(scores[k]);
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="flex-1 text-[11px] text-muted-foreground">{LABELS[k]}</span>
                <Progress value={v * 10} className="h-1.5 w-16" />
                <span className="w-8 text-right text-[11px] font-medium tabular-nums">
                  {v.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}