import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DiamondScores } from "@/components/DiamondScore";

export type QualityCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type QualityReport = {
  checks: QualityCheck[];
  failed: QualityCheck[];
  passes: boolean;
};

/**
 * AB Logo Quality Filter — evaluates a rendering against the AB Design Standard
 * before it can be presented to a paying client.
 */
export function evaluateLogoQuality(args: {
  scores: DiamondScores | null;
  svg?: string | null;
  conceptType?: string | null;
  accentHex?: string | null;
}): QualityReport {
  const { scores, svg, accentHex } = args;
  const s = scores;
  const svgText = (svg || "").toLowerCase();

  const accentUsed = accentHex
    ? svgText.includes(accentHex.replace("#", "").toLowerCase()) ||
      svgText.includes(accentHex.toLowerCase())
    : true;

  const checks: QualityCheck[] = [
    {
      key: "not_generic",
      label: "Does not look generic",
      passed: !!s && (s.brand_strategy_fit ?? 0) >= 8.5 && (s.professional_polish ?? 0) >= 8.5,
      detail: "Brand strategy fit and polish must be 8.5+.",
    },
    {
      key: "typography",
      label: "Typography is strong",
      passed: !!s && (s.typography_quality ?? 0) >= 8.5,
      detail: "Typography quality must be 8.5+.",
    },
    {
      key: "spacing",
      label: "Spacing is intentional",
      passed: !!s && (s.visual_balance ?? 0) >= 8.5,
      detail: "Visual balance must be 8.5+.",
    },
    {
      key: "icon",
      label: "Icon / mark is not too basic",
      passed: !!s && (s.shape_strength ?? 0) >= 8.5,
      detail: "Shape strength must be 8.5+.",
    },
    {
      key: "layout",
      label: "Layout is balanced",
      passed: !!s && (s.visual_balance ?? 0) >= 8.5 && (s.professional_polish ?? 0) >= 8.5,
      detail: "Visual balance and polish must be 8.5+.",
    },
    {
      key: "accent",
      label: "Accent color reads as intentional",
      passed: accentUsed && !!s && (s.color_strength ?? 0) >= 8.0,
      detail: "Accent must appear in the artwork and color strength must be 8.0+.",
    },
    {
      key: "client_ready",
      label: "Would impress a paying client",
      passed: !!s && (s.professional_polish ?? 0) >= 9.0,
      detail: "Professional polish must be 9.0+.",
    },
    {
      key: "ab_effort",
      label: "Reads as AB-crafted, not auto-generated",
      passed: !!s && (s.brand_strategy_fit ?? 0) >= 8.5 && (s.shape_strength ?? 0) >= 8.5,
      detail: "Strategy fit and shape strength must be 8.5+.",
    },
    {
      key: "brand_kit",
      label: "Can extend into a real brand kit",
      passed: !!s && (s.brand_strategy_fit ?? 0) >= 8.5 && (s.color_strength ?? 0) >= 8.0,
      detail: "Strategy and color strength must hold up across applications.",
    },
    {
      key: "vector",
      label: "Production-clean vector artwork",
      passed: !!s && (s.vector_readiness ?? 0) >= 9.0,
      detail: "Vector readiness must be 9.0+.",
    },
    {
      key: "production",
      label: "Works on cards, apparel, signage & social",
      passed:
        !!s &&
        (s.embroidery_readiness ?? 0) >= 8.5 &&
        (s.signage_readiness ?? 0) >= 8.5 &&
        (s.social_media_readiness ?? 0) >= 8.5 &&
        (s.apparel_readiness ?? 0) >= 8.5,
      detail: "All four production scores must be 8.5+.",
    },
  ];

  const failed = checks.filter((c) => !c.passed);
  return { checks, failed, passes: failed.length === 0 };
}

export function LogoQualityFilter({
  report,
  onImprove,
  busy,
}: {
  report: QualityReport;
  onImprove: () => void;
  busy?: boolean;
}) {
  const { passes, failed, checks } = report;

  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        passes
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {passes ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
          )}
          <div>
            <p className="font-medium">
              {passes
                ? "Meets the AB Design Standard"
                : "This rendering does not meet the AB Design Standard. Refine before presenting."}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {passes
                ? `${checks.length}/${checks.length} quality checks passed.`
                : `${failed.length} of ${checks.length} checks need attention.`}
            </p>
          </div>
        </div>
        <Badge variant={passes ? "secondary" : "destructive"}>
          {passes ? "AB Approved" : "Needs Refinement"}
        </Badge>
      </div>

      {!passes && (
        <ul className="mt-2 space-y-1">
          {failed.map((c) => (
            <li key={c.key} className="text-xs text-amber-700 dark:text-amber-300">
              • {c.label}
              {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      {!passes && (
        <div className="mt-3">
          <Button size="sm" variant="default" onClick={onImprove} disabled={busy}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Improve Rendering
          </Button>
        </div>
      )}
    </div>
  );
}