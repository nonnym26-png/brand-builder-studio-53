import { useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { Loader2, Sparkles, RefreshCw, Download, Check, FileText, Wand2, ShieldCheck, AlertTriangle, XCircle, Cpu, Layers, Package, Send, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateAbDesign, reviseAbDesign, listAbDesigns, approveAbDesign, exportBrandKit } from "@/api/abCreativeEngine.functions";

type Design = {
  id: string;
  brand_profile_id: string;
  image_url: string;
  prompt_used: string | null;
  design_type: string | null;
  revision_number: number;
  parent_design_id: string | null;
  is_approved: boolean;
  created_at: string;
  quality_score?: number | null;
  quality_decision?: string | null;
  quality_breakdown?: Record<string, number> | null;
  quality_notes?: string | null;
  model_used?: string | null;
  concept_group_id?: string | null;
  concept_index?: number | null;
  output_mode?: string | null;
  creative_briefs?: { brief_json: unknown; final_prompt: string; negative_prompt: string } | null;
};

const STEPS = [
  "Reviewing business information",
  "Building creative direction",
  "Writing professional design prompt",
  "Rendering design with AI",
  "Saving design to AB Builder",
];

const QUICK_REVISIONS = [
  "More professional",
  "More bold",
  "Less cartoon",
  "More mascot",
  "Transparent background",
  "Start over",
];

export type AbCreativeEngineHandle = {
  generate: (bg?: "white" | "transparent" | "dark" | "mockup-free", outputCount?: number) => Promise<void>;
  refresh: () => Promise<void>;
};

type AbCreativeEngineProps = {
  brandProfileId: string | null;
  hideHeaderGenerate?: boolean;
  designDna?: { mustHave?: string; avoid?: string; qualityBar?: string; formula?: string };
  extras?: {
    fonts?: { heading?: string; body?: string; accent?: string };
    chosenSlogan?: string | null;
    elements?: string[];
    mascot?: { enabled?: boolean; style?: string; idea?: string };
  };
};

export const AbCreativeEngine = forwardRef<AbCreativeEngineHandle, AbCreativeEngineProps>(function AbCreativeEngine(
  { brandProfileId, hideHeaderGenerate, designDna, extras },
  ref,
) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [background, setBackground] = useState<"white" | "transparent" | "dark" | "mockup-free">("white");
  const [drawer, setDrawer] = useState<Design | null>(null);
  const [qualityDrawer, setQualityDrawer] = useState<Design | null>(null);
  const [reviseTarget, setReviseTarget] = useState<Design | null>(null);
  const [reviseText, setReviseText] = useState("");
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    if (!brandProfileId) return;
    try {
      const r = await listAbDesigns({ data: { brandProfileId } });
      setDesigns(r.designs as Design[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { refresh(); }, [brandProfileId]);

  const runProgress = async (work: () => Promise<void>) => {
    setBusy(true);
    setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 1800);
    try {
      await work();
      setStep(STEPS.length - 1);
    } finally {
      clearInterval(tick);
      setTimeout(() => { setBusy(false); setStep(-1); }, 600);
    }
  };

  const onGenerate = async (bgOverride?: typeof background, outputCount?: number) => {
    if (!brandProfileId) { toast.error("Select a brand profile first"); return; }
    const bg = bgOverride ?? background;
    await runProgress(async () => {
      try {
        await generateAbDesign({ data: { brandProfileId, backgroundChoice: bg, outputCount: outputCount ?? 1, designDna, extras } });
        toast.success(outputCount && outputCount > 1 ? `${outputCount} concepts generated` : "Design generated");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Generation failed");
      }
    });
  };

  useImperativeHandle(ref, () => ({ generate: onGenerate, refresh }), [brandProfileId, background, designDna, extras]);

  const onRevise = async () => {
    if (!reviseTarget || !reviseText.trim()) return;
    const target = reviseTarget;
    const text = reviseText;
    setReviseTarget(null);
    setReviseText("");
    await runProgress(async () => {
      try {
        await reviseAbDesign({ data: { generatedDesignId: target.id, userRequest: text } });
        toast.success("Revision rendered");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Revision failed");
      }
    });
  };

  const onApprove = async (d: Design) => {
    try {
      await approveAbDesign({ data: { generatedDesignId: d.id, approved: !d.is_approved } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const onExport = async () => {
    if (!brandProfileId) { toast.error("Select a brand profile first"); return; }
    setExporting(true);
    try {
      const res = await exportBrandKit({ data: { brandProfileId } });
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Brand kit exported (${res.count} assets)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AB Creative Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            This is the renderer. It pulls <strong>everything</strong> you set above — Phase 1 intake, colors, fonts, slogan, brand elements, mascot, and your Design DNA Rules — sends it to AI in two stages (creative brief → master prompt → image), and saves the result to the gallery. Use <strong>Revise</strong> on a card to iterate without losing direction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Background</Label>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={background}
            onChange={(e) => setBackground(e.target.value as typeof background)}
          >
            <option value="white">White</option>
            <option value="transparent">Transparent</option>
            <option value="dark">Dark</option>
            <option value="mockup-free">Mockup-free</option>
          </select>
          {!hideHeaderGenerate && (
            <Button onClick={() => onGenerate()} disabled={busy || !brandProfileId}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generate Design
            </Button>
          )}
          <Button variant="outline" onClick={onExport} disabled={exporting || !brandProfileId || designs.filter((d) => d.is_approved).length === 0}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Export Brand Kit
          </Button>
          <Button variant="outline" onClick={onCreateProof} disabled={creatingProof || !brandProfileId || designs.filter((d) => d.is_approved).length === 0}>
            {creatingProof ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Create Client Proof
          </Button>
        </div>
      </div>

      {busy && (
        <ol className="mt-5 grid gap-2 sm:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-md border px-3 py-2 text-[11px] ${i <= step ? "border-primary/40 bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
              <div className="font-semibold">Step {i + 1}</div>
              <div>{s}</div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Generated Design Gallery</h3>
        {designs.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border p-6 text-center">
            No designs yet. Click <strong>Generate Design</strong> to create your first concept.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="aspect-square bg-muted/40 flex items-center justify-center">
                  <img src={d.image_url} alt={d.design_type || "Design"} className="h-full w-full object-contain" />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <div className="font-semibold truncate">{d.design_type || "Design"}</div>
                      <div className="text-muted-foreground">
                        {d.revision_number > 0 ? `Revision ${d.revision_number}` : "Original"}
                        {typeof d.concept_index === "number" && d.concept_index > 0 ? ` · #${d.concept_index + 1}` : ""}
                      </div>
                    </div>
                    {d.is_approved && <Badge variant="default" className="bg-emerald-600">Approved</Badge>}
                  </div>
                  <QualityRow design={d} onOpen={() => setQualityDrawer(d)} />
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setDrawer(d)}>
                      <FileText className="h-3 w-3" /> Brief
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={d.image_url} download target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3" /> PNG
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReviseTarget(d)}>
                      <RefreshCw className="h-3 w-3" /> Revise
                    </Button>
                    <Button size="sm" variant={d.is_approved ? "secondary" : "default"} onClick={() => onApprove(d)}>
                      <Check className="h-3 w-3" /> {d.is_approved ? "Unapprove" : "Approve"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brief / Prompt drawer */}
      <Dialog open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Creative Brief & Prompt</DialogTitle>
          </DialogHeader>
          {drawer && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-sm mb-1">Brief</h4>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3">
                  {JSON.stringify(drawer.creative_briefs?.brief_json, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Final prompt</h4>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3">{drawer.creative_briefs?.final_prompt}</pre>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Negative prompt</h4>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3">{drawer.creative_briefs?.negative_prompt}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revision modal */}
      <Dialog open={!!reviseTarget} onOpenChange={(o) => !o && setReviseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Describe what should change. Direction (business name, mark type, palette) is preserved unless you say otherwise. Type "start over" to begin fresh.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REVISIONS.map((q) => (
                <Button key={q} size="sm" variant="outline" onClick={() => setReviseText((t) => (t ? `${t} · ${q}` : q))}>
                  {q}
                </Button>
              ))}
            </div>
            <Textarea rows={4} value={reviseText} onChange={(e) => setReviseText(e.target.value)} placeholder="e.g. Make it more bold and tighten the spacing under the wordmark." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviseTarget(null)}>Cancel</Button>
            <Button onClick={onRevise} disabled={!reviseText.trim()}>
              <Wand2 className="h-4 w-4" /> Render revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quality drawer */}
      <Dialog open={!!qualityDrawer} onOpenChange={(o) => !o && setQualityDrawer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Quality Report
            </DialogTitle>
          </DialogHeader>
          {qualityDrawer && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Overall score</span>
                <span className="text-base font-semibold">
                  {qualityDrawer.quality_score != null ? `${Number(qualityDrawer.quality_score).toFixed(1)} / 10` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Decision</span>
                <DecisionBadge decision={qualityDrawer.quality_decision} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Cpu className="h-3 w-3" /> Model</span>
                <span>{friendlyModel(qualityDrawer.model_used)}</span>
              </div>
              {qualityDrawer.quality_breakdown && (
                <div>
                  <div className="font-semibold text-sm mb-1.5">Breakdown</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(qualityDrawer.quality_breakdown).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded border border-border px-2 py-1">
                        <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                        <span className="font-medium">{Number(v).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {qualityDrawer.quality_notes && (
                <div>
                  <div className="font-semibold text-sm mb-1">Notes</div>
                  <p className="rounded-md bg-muted p-3 whitespace-pre-wrap">{qualityDrawer.quality_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofUrl} onOpenChange={(o) => !o && setProofUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2"><Send className="h-4 w-4" /> Client Proof Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Share this link with the client. They'll see a clean, branded proof page (no internal prompts, DNA, or model details) and can approve, request a minor revision, or ask for a new direction.</p>
            <div className="flex items-center gap-2">
              <input readOnly value={proofUrl ?? ""} className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-xs" />
              <Button size="sm" variant="outline" onClick={() => { if (proofUrl) { navigator.clipboard.writeText(proofUrl); toast.success("Link copied"); } }}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button size="sm" asChild>
                <a href={proofUrl ?? "#"} target="_blank" rel="noreferrer">Open</a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
});

function friendlyModel(model?: string | null): string {
  if (!model) return "—";
  if (model.includes("pro-image")) return "Premium Refined";
  if (model.includes("flash-image")) return "Fast Concept";
  if (model.includes("gpt-5")) return "Strategy Engine";
  return model;
}

function DecisionBadge({ decision }: { decision?: string | null }) {
  if (!decision) return <span className="text-muted-foreground">—</span>;
  const d = decision.toLowerCase();
  if (d === "approve" || d === "approved" || d === "pass") {
    return <Badge className="bg-emerald-600"><ShieldCheck className="h-3 w-3" /> Approved</Badge>;
  }
  if (d === "review" || d === "warn") {
    return <Badge className="bg-amber-600"><AlertTriangle className="h-3 w-3" /> Review</Badge>;
  }
  if (d === "reject" || d === "rejected" || d === "fail") {
    return <Badge variant="destructive"><XCircle className="h-3 w-3" /> Rejected</Badge>;
  }
  return <Badge variant="secondary">{decision}</Badge>;
}

function QualityRow({ design, onOpen }: { design: Design; onOpen: () => void }) {
  const score = design.quality_score != null ? Number(design.quality_score) : null;
  const decision = (design.quality_decision || "").toLowerCase();
  const tone =
    decision === "approve" || decision === "approved" || decision === "pass"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : decision === "reject" || decision === "rejected" || decision === "fail"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : decision
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border bg-muted/40 text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full inline-flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] transition hover:opacity-90 ${tone}`}
    >
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="h-3 w-3" />
        Quality {score != null ? `${score.toFixed(1)}/10` : "—"}
      </span>
      <span className="inline-flex items-center gap-1">
        <Layers className="h-3 w-3" />
        {friendlyModel(design.model_used)}
      </span>
    </button>
  );
}