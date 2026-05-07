import { useEffect, useState } from "react";
import { Loader2, Sparkles, RefreshCw, Download, Check, FileText, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateAbDesign, reviseAbDesign, listAbDesigns, approveAbDesign } from "@/api/abCreativeEngine.functions";

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

export function AbCreativeEngine({
  brandProfileId,
  designDna,
  extras,
}: {
  brandProfileId: string | null;
  designDna?: { mustHave?: string; avoid?: string; qualityBar?: string; formula?: string };
  extras?: {
    fonts?: { heading?: string; body?: string; accent?: string };
    chosenSlogan?: string | null;
    elements?: string[];
    mascot?: { enabled?: boolean; style?: string; idea?: string };
  };
}) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [background, setBackground] = useState<"white" | "transparent" | "dark" | "mockup-free">("white");
  const [drawer, setDrawer] = useState<Design | null>(null);
  const [reviseTarget, setReviseTarget] = useState<Design | null>(null);
  const [reviseText, setReviseText] = useState("");

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

  const onGenerate = async () => {
    if (!brandProfileId) { toast.error("Select a brand profile first"); return; }
    await runProgress(async () => {
      try {
        await generateAbDesign({ data: { brandProfileId, backgroundChoice: background, designDna, extras } });
        toast.success("Design generated");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Generation failed");
      }
    });
  };

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
          <Button onClick={onGenerate} disabled={busy || !brandProfileId}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate Design
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
                      </div>
                    </div>
                    {d.is_approved && <Badge variant="default" className="bg-emerald-600">Approved</Badge>}
                  </div>
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
    </section>
  );
}