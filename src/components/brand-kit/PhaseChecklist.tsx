import { Check, Circle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ChecklistItem = { label: string; done: boolean; optional?: boolean };

export type PhaseStatus =
  | "Intake Started"
  | "Ready for Concepts"
  | "Concept Development"
  | "Ready for Brand Kit"
  | "Brand Kit Sent"
  | "Revision Requested"
  | "Approved Final"
  | "Exported / Complete";

export type PhaseBadge =
  | "Incomplete"
  | "Ready"
  | "Sent to Client"
  | "Revision Requested"
  | "Approved"
  | "Exported";

function val(v: unknown) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return Boolean(v);
}

/** Phase 1 — Business Intake */
export function buildPhase1Checklist(profile: Record<string, unknown> | null | undefined): ChecklistItem[] {
  const p = profile || {};
  return [
    { label: "Business name entered", done: val(p.business_name) },
    { label: "Industry selected", done: val(p.industry) },
    { label: "Business description added", done: val(p.business_description) },
    { label: "Current business setup added", done: val(p.business_stage) },
    { label: "Services / products listed", done: val(p.main_products_services) },
    { label: "Target customer described", done: val(p.target_customer) },
    { label: "Business goals captured", done: val(p.brand_goals) },
    { label: "Logo direction selected", done: val(p.logo_direction) },
  ];
}

/** Phase 2 — Logo Direction */
export function buildPhase2Checklist(input: {
  profile: Record<string, unknown> | null | undefined;
  designs: Array<{ id: string; design_type: string | null; quality_score: number | null; is_approved: boolean }>;
}): ChecklistItem[] {
  const p = input.profile || {};
  const designs = input.designs || [];
  const has = (re: RegExp) => designs.some((d) => re.test(d.design_type || ""));
  return [
    { label: "Design DNA generated", done: val(p.design_dna) || val(p.brand_profile_summary) },
    { label: "At least 4 logo concepts generated", done: designs.length >= 4 },
    { label: "Quality scores completed", done: designs.length > 0 && designs.some((d) => d.quality_score != null) },
    { label: "One concept selected", done: val(p.selected_logo_concept) || designs.some((d) => d.is_approved) },
    { label: "Premium refined version created", done: has(/refined|premium/i) },
    { label: "Transparent production logo created", done: has(/transparent/i) },
    { label: "Embroidery-safe version created", done: has(/embroidery/i), optional: true },
    { label: "Badge / emblem support mark created", done: has(/badge|emblem|crest/i), optional: true },
    { label: "Social icon / favicon created", done: has(/favicon|social|icon/i), optional: true },
  ];
}

/** Phase 3 — Brand Kit Review */
export function buildPhase3Checklist(input: {
  profile: Record<string, unknown> | null | undefined;
  hasPrimary: boolean;
  hasVariations: boolean;
  hasPalette: boolean;
  hasTypography: boolean;
  hasReviewLink: boolean;
  approvalStatus: string | null | undefined;
  exportedAt: string | null | undefined;
}): ChecklistItem[] {
  const p = input.profile || {};
  return [
    { label: "Brand overview generated", done: val(p.business_name) && val(p.industry) },
    { label: "Primary logo included", done: input.hasPrimary },
    { label: "Logo variations included", done: input.hasVariations },
    { label: "Color palette included", done: input.hasPalette },
    { label: "Typography direction included", done: input.hasTypography },
    { label: "Brand usage guide included", done: input.hasPrimary }, // built-in once primary exists
    { label: "Production recommendations included", done: true },
    { label: "Client review link created", done: input.hasReviewLink },
    { label: "Client approval received", done: input.approvalStatus === "approve_final" },
    { label: "Final ZIP exported", done: Boolean(input.exportedAt) },
  ];
}

export function derivePhase1Message(items: ChecklistItem[]) {
  const missingRequired = items.filter((i) => !i.done && !i.optional);
  if (missingRequired.length === 0) return { tone: "ok" as const, text: "Phase 1 complete — ready for logo direction." };
  return { tone: "warn" as const, text: "Phase 1 incomplete — missing required brand information." };
}

export function derivePhase2Message(items: ChecklistItem[]) {
  const find = (label: string) => items.find((i) => i.label === label);
  if (!find("One concept selected")?.done) return { tone: "warn" as const, text: "Select a logo direction before moving to Phase 3." };
  const productionLabels = [
    "Premium refined version created",
    "Transparent production logo created",
  ];
  if (productionLabels.some((l) => !find(l)?.done)) {
    return { tone: "warn" as const, text: "Production logo assets are not complete." };
  }
  return { tone: "ok" as const, text: "Phase 2 complete — ready to build brand kit." };
}

export function derivePhase3Message(items: ChecklistItem[], approvalStatus: string | null | undefined) {
  if (approvalStatus === "approve_final") return { tone: "ok" as const, text: "Brand kit approved — ready for final export." };
  if (approvalStatus === "minor_revision" || approvalStatus === "full_redesign") {
    return { tone: "warn" as const, text: "Client requested revision — return to Phase 2 or regenerate Phase 3 preview." };
  }
  const linkSent = items.find((i) => i.label === "Client review link created")?.done;
  if (!linkSent) return { tone: "warn" as const, text: "Brand kit is ready but has not been sent to client." };
  return { tone: "info" as const, text: "Awaiting client review." };
}

export function deriveProjectStatus(input: {
  phase1Done: boolean;
  phase2ConceptsCount: number;
  phase2Selected: boolean;
  phase3Ready: boolean;
  reviewLinkSent: boolean;
  approvalStatus: string | null | undefined;
  exportedAt: string | null | undefined;
}): PhaseStatus {
  if (input.exportedAt) return "Exported / Complete";
  if (input.approvalStatus === "approve_final") return "Approved Final";
  if (input.approvalStatus === "minor_revision" || input.approvalStatus === "full_redesign") return "Revision Requested";
  if (input.reviewLinkSent) return "Brand Kit Sent";
  if (input.phase3Ready) return "Ready for Brand Kit";
  if (input.phase2Selected) return "Ready for Brand Kit";
  if (input.phase2ConceptsCount > 0) return "Concept Development";
  if (input.phase1Done) return "Ready for Concepts";
  return "Intake Started";
}

export function deriveBadge(input: {
  approvalStatus: string | null | undefined;
  exportedAt: string | null | undefined;
  reviewLinkSent: boolean;
  phaseReady: boolean;
}): PhaseBadge {
  if (input.exportedAt) return "Exported";
  if (input.approvalStatus === "approve_final") return "Approved";
  if (input.approvalStatus === "minor_revision" || input.approvalStatus === "full_redesign") return "Revision Requested";
  if (input.reviewLinkSent) return "Sent to Client";
  if (input.phaseReady) return "Ready";
  return "Incomplete";
}

const BADGE_TONE: Record<PhaseBadge, string> = {
  Incomplete: "border-border bg-muted text-muted-foreground",
  Ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "Sent to Client": "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Revision Requested": "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Approved: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Exported: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

export function PhaseChecklist({
  title,
  items,
  message,
  badge,
  projectStatus,
}: {
  title: string;
  items: ChecklistItem[];
  message: { tone: "ok" | "warn" | "info"; text: string };
  badge: PhaseBadge;
  projectStatus?: PhaseStatus;
}) {
  const toneClass =
    message.tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : message.tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-border bg-muted/40 text-foreground";

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${BADGE_TONE[badge]}`}>{badge}</span>
      </div>
      <ul className="space-y-1.5 text-xs">
        {items.map((it) => (
          <li key={it.label} className={`flex items-center gap-2 ${it.done ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${it.done ? "border-emerald-500 bg-emerald-500/15" : "border-border"}`}>
              {it.done ? <Check className="h-2.5 w-2.5" /> : <Circle className="h-2 w-2 opacity-50" />}
            </span>
            <span>{it.label}{it.optional && <span className="ml-1 text-muted-foreground">(if applicable)</span>}</span>
          </li>
        ))}
      </ul>
      <div className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${toneClass}`}>
        {message.tone === "warn" && <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
        {message.tone === "ok" && <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
        <span>{message.text}</span>
      </div>
      {projectStatus && (
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground border-t border-border pt-2">
          Project status: <span className="text-foreground font-semibold">{projectStatus}</span>
        </div>
      )}
    </section>
  );
}