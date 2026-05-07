import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Database, Download, Copy, ExternalLink, Loader2, RefreshCw, Send, Check, RotateCcw, Sparkles, Lock, ShieldCheck, Eye,
} from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles } from "@/api/phase2.functions";
import {
  loadBrandKit,
  createBrandKitReviewLink,
  markBrandKitExported,
  reopenPhase2,
} from "@/api/brandKit.functions";
import { adminApproveProof } from "@/api/clientProof.functions";
import { PhaseChecklist, buildPhase3Checklist, derivePhase3Message, deriveBadge, deriveProjectStatus } from "@/components/brand-kit/PhaseChecklist";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-3")({
  head: () => ({ meta: [{ title: "Phase 3 — Brand Kit Review | Anaglyph Branding" }] }),
  component: Phase3,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null };

type BrandKit = Awaited<ReturnType<typeof loadBrandKit>>;

function Phase3() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewToken, setReviewToken] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const load = async (id: string) => {
    setSelectedId(id);
    setKit(null);
    setReviewToken(null);
    if (!id) return;
    setLoading(true);
    try {
      const data = await loadBrandKit({ data: { brandProfileId: id, admin: true } });
      setKit(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (selectedId) await load(selectedId);
  };

  const reviewUrl = useMemo(() => {
    if (!reviewToken && !kit?.adminView?.latestProof?.token) return null;
    const t = reviewToken || kit?.adminView?.latestProof?.token;
    if (typeof window === "undefined" || !t) return null;
    return `${window.location.origin}/proof/${t}`;
  }, [reviewToken, kit]);

  const sendReviewLink = async () => {
    if (!selectedId) return;
    setBusy("link");
    try {
      const r = await createBrandKitReviewLink({ data: { brandProfileId: selectedId } });
      setReviewToken(r.token);
      toast.success(r.reused ? "Existing pending review link refreshed" : "Review link created");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    if (!reviewUrl) return;
    await navigator.clipboard.writeText(reviewUrl);
    toast.success("Review link copied");
  };

  const markApproved = async () => {
    if (!kit?.adminView?.latestProof) return;
    setBusy("approve");
    try {
      await adminApproveProof({ data: { proofId: kit.adminView.latestProof.id, notes: "Approved by AB on client behalf" } });
      toast.success("Marked approved");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  const exportZip = async () => {
    if (!kit) return;
    setBusy("export");
    try {
      const zip = new JSZip();
      const slug = (kit.publicView.brand.businessName || "brand").toLowerCase().replace(/\s+/g, "-");
      const root = zip.folder(slug)!;
      const logos = root.folder("logos")!;

      const fetchAsBlob = async (url: string) => (await fetch(url)).blob();
      const addAsset = async (folder: JSZip, label: string, url: string | undefined) => {
        if (!url) return;
        try {
          const blob = await fetchAsBlob(url);
          const ext = (url.split("?")[0].split(".").pop() || "png").slice(0, 4);
          folder.file(`${label}.${ext}`, blob);
        } catch { /* skip on failure */ }
      };

      if (kit.publicView.primary) await addAsset(logos, "primary-logo", kit.publicView.primary.image_url);
      for (const v of kit.publicView.variations) {
        if (!v) continue;
        await addAsset(logos, slugify(v.label), v.image_url);
      }

      // HTML summary (client-friendly, no internals)
      root.file("Brand-Kit-Summary.html", buildHtmlSummary(kit));

      // Manifest (no internal prompts/DNA)
      const manifest = {
        businessName: kit.publicView.brand.businessName,
        industry: kit.publicView.brand.industry,
        selectedDirection: kit.publicView.brand.selectedDirection,
        palette: kit.publicView.palette,
        typography: kit.publicView.typography,
        variations: kit.publicView.variations.filter(Boolean).map((v: any) => ({ label: v.label, use: v.use })),
        usageGuide: kit.publicView.usageGuide,
        productionRecommendations: kit.publicView.productionRecommendations,
        generatedAt: new Date().toISOString(),
      };
      root.file("manifest.json", JSON.stringify(manifest, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${slug}-brand-kit.zip`; a.click();
      URL.revokeObjectURL(url);

      await markBrandKitExported({ data: { brandProfileId: kit.profileId } });
      toast.success("Brand kit exported");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); }
    finally { setBusy(null); }
  };

  const reopen = async () => {
    if (!selectedId) return;
    setBusy("reopen");
    try {
      await reopenPhase2({ data: { brandProfileId: selectedId, reason: reopenReason || undefined } });
      toast.success("Phase 2 reopened for new direction");
      window.location.href = "/phase-2";
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  const status = kit?.status.clientProofStatus;
  const approved = status === "approve_final";

  const checklistItems = kit ? buildPhase3Checklist({
    profile: { business_name: kit.publicView.brand.businessName, industry: kit.publicView.brand.industry } as Record<string, unknown>,
    hasPrimary: Boolean(kit.publicView.primary),
    hasVariations: kit.publicView.variations.filter(Boolean).length > 0,
    hasPalette: kit.publicView.palette.length > 0,
    hasTypography: Boolean(kit.publicView.typography?.heading || kit.publicView.typography?.body),
    hasReviewLink: Boolean(kit.adminView?.latestProof?.token),
    approvalStatus: status ?? null,
    exportedAt: kit.adminView?.brandKitExportedAt ?? null,
  }) : [];
  const phase3Msg = kit ? derivePhase3Message(checklistItems, status) : { tone: "info" as const, text: "" };
  const phase3Badge = deriveBadge({
    approvalStatus: status ?? null,
    exportedAt: kit?.adminView?.brandKitExportedAt ?? null,
    reviewLinkSent: Boolean(kit?.adminView?.latestProof?.token),
    phaseReady: Boolean(kit && kit.publicView.primary),
  });
  const projectStatus = kit ? deriveProjectStatus({
    phase1Done: true,
    phase2ConceptsCount: kit.status.approvedCount,
    phase2Selected: kit.status.approvedCount > 0,
    phase3Ready: Boolean(kit.publicView.primary),
    reviewLinkSent: Boolean(kit.adminView?.latestProof?.token),
    approvalStatus: status ?? null,
    exportedAt: kit.adminView?.brandKitExportedAt ?? null,
  }) : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Phase 3 — Brand Kit Review</div>
              <div className="text-xs text-muted-foreground">Polished client deliverable. Admin view.</div>
            </div>
          </div>
          <PhaseStepper current="/phase-3" completed={{ "/phase-3": Boolean(kit?.status.phase3CompletedAt) }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Project
            </h2>
            <Select value={selectedId} onValueChange={load}>
              <SelectTrigger><SelectValue placeholder="Pick a project" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.business_name || "Untitled"} · {p.client_name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {kit && (
            <>
              <PhaseChecklist
                title="Phase 3 — Brand Kit Review"
                items={checklistItems}
                message={phase3Msg}
                badge={phase3Badge}
                projectStatus={projectStatus}
              />

              <section className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={approved ? "default" : "outline"}>
                    {approved ? <Check className="h-3 w-3 mr-1" /> : null}
                    {labelStatus(status)}
                  </Badge>
                  <Badge variant="outline">{kit.status.approvedCount} approved assets</Badge>
                  {kit.adminView?.qualityAvg != null && <Badge variant="outline">Quality {kit.adminView.qualityAvg}/10</Badge>}
                  {kit.adminView?.brandKitExportedAt && <Badge variant="outline"><Download className="h-3 w-3 mr-1" />Exported</Badge>}
                </div>
              </section>

              <section className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin actions</div>
                <Button size="sm" variant="outline" className="w-full" onClick={refresh} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate preview
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={sendReviewLink} disabled={busy === "link"}>
                  {busy === "link" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  Create / refresh review link
                </Button>
                {reviewUrl && (
                  <div className="rounded-md border border-dashed border-border p-2 space-y-1.5">
                    <div className="text-[10px] uppercase text-muted-foreground">Client review link</div>
                    <div className="text-[11px] break-all font-mono">{reviewUrl}</div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1" onClick={copyLink}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <a href={reviewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Open</a>
                      </Button>
                    </div>
                  </div>
                )}
                {!approved && kit.adminView?.latestProof && (
                  <Button size="sm" variant="outline" className="w-full" onClick={markApproved} disabled={busy === "approve"}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Mark approved manually
                  </Button>
                )}
                <Button size="sm" className="w-full" onClick={exportZip} disabled={busy === "export"}>
                  {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                  Export Brand Kit (ZIP)
                </Button>
              </section>

              <section className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reopen Phase 2
                </div>
                <p className="text-[11px] text-muted-foreground">If the client asked for a new direction, reopen Phase 2 to start a fresh concept group. Existing history is preserved.</p>
                <Textarea rows={2} placeholder="Reason / direction notes" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                <Button size="sm" variant="outline" className="w-full" onClick={reopen} disabled={busy === "reopen"}>
                  Reopen Phase 2
                </Button>
              </section>

              {kit.adminView?.latestProof && (
                <section className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Client review</div>
                  <div className="text-xs">
                    <div>Status: <strong>{labelStatus(kit.adminView.latestProof.status)}</strong></div>
                    {kit.adminView.latestProof.submitted_at && (
                      <div className="text-muted-foreground">Submitted {new Date(kit.adminView.latestProof.submitted_at).toLocaleString()}</div>
                    )}
                  </div>
                  {kit.adminView.latestProof.response_notes && (
                    <div className="rounded border border-border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
                      {kit.adminView.latestProof.response_notes}
                    </div>
                  )}
                </section>
              )}

              {kit.adminView?.revisionHistory?.length ? (
                <section className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Revision history</div>
                  <ul className="space-y-1.5 text-xs">
                    {kit.adminView.revisionHistory.slice(0, 8).map((r) => (
                      <li key={r.id} className="border-l-2 border-border pl-2">
                        <div className="text-muted-foreground text-[10px]">{new Date(r.at).toLocaleDateString()}</div>
                        <div>{r.request}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </aside>

        <section className="space-y-6">
          {!kit ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">Pick a project that has approved Phase 2 assets to assemble its brand kit.</p>
              <p className="text-xs mt-2">No approvals yet? Head back to <Link to="/phase-2" className="underline">Phase 2</Link>.</p>
            </div>
          ) : approved ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-500" />
              <span><strong>Brand kit approved.</strong> The client signed off — ready for final export.</span>
            </div>
          ) : null}

          {kit && <BrandKitPreview kit={kit} />}
        </section>
      </main>
    </div>
  );
}

function BrandKitPreview({ kit }: { kit: BrandKit }) {
  const v = kit.publicView;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Brand Overview</div>
        <h1 className="text-3xl font-semibold mt-1">{v.brand.businessName}</h1>
        {v.brand.industry && <div className="text-sm text-muted-foreground mt-1">{v.brand.industry}</div>}
        {v.brand.description && <p className="mt-3 text-sm leading-relaxed">{v.brand.description}</p>}
        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          {v.brand.targetAudience && (
            <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Target audience</div>{v.brand.targetAudience}</div>
          )}
          {v.brand.personality?.length ? (
            <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Brand personality</div>{(v.brand.personality as string[]).join(", ")}</div>
          ) : null}
        </div>
        {v.brand.selectedDirection && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Selected direction</div>
            <div className="text-sm">{v.brand.selectedDirection}</div>
          </div>
        )}
      </div>

      {v.primary && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Primary Logo</div>
          <div className="aspect-[16/10] w-full bg-muted/40 rounded-xl grid place-items-center overflow-hidden mt-3">
            <img src={v.primary.image_url} alt="Primary logo" className="max-h-full max-w-full object-contain p-8" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.whyThisDirection}</p>
          <div className="mt-3 text-xs"><strong>Recommended use:</strong> {v.usageGuide.primary}</div>
        </div>
      )}

      {v.variations.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Logo Variations</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {v.variations.filter(Boolean).map((va: any) => (
              <div key={va.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="aspect-square bg-muted/40 grid place-items-center">
                  <img src={va.image_url} alt={va.label} className="max-h-full max-w-full object-contain p-6" />
                </div>
                <div className="p-4 space-y-1">
                  <div className="font-semibold text-sm">{va.label}</div>
                  <div className="text-xs text-muted-foreground">{va.use}</div>
                  <a className="text-xs underline inline-flex items-center gap-1" href={va.image_url} target="_blank" rel="noreferrer">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {v.palette.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Color Palette</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {v.palette.map((c) => (
              <div key={c.hex!} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-24" style={{ background: c.hex! }} />
                <div className="p-3">
                  <div className="text-sm font-medium">{c.name || c.role}</div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-widest">{c.role}</div>
                  <div className="text-xs font-mono uppercase mt-0.5">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(v.typography?.heading || v.typography?.body) && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Typography</div>
          <div className="mt-3 space-y-2 text-sm">
            {v.typography.heading && <div><span className="text-muted-foreground">Heading:</span> <strong>{v.typography.heading}</strong> — use for titles, hero copy, signage.</div>}
            {v.typography.body && <div><span className="text-muted-foreground">Body:</span> <strong>{v.typography.body}</strong> — use for paragraphs, captions, UI.</div>}
            {v.typography.accent && <div><span className="text-muted-foreground">Accent:</span> <strong>{v.typography.accent}</strong> — use sparingly for emphasis.</div>}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Brand Usage Guide</div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><strong>Primary:</strong> {v.usageGuide.primary}</div>
          <div><strong>Transparent:</strong> {v.usageGuide.transparent}</div>
          <div><strong>Embroidery:</strong> {v.usageGuide.embroidery}</div>
          <div><strong>Badge / Emblem:</strong> {v.usageGuide.badge}</div>
          <div className="sm:col-span-2"><strong>Social / Favicon:</strong> {v.usageGuide.social}</div>
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Do not</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
            {v.usageGuide.avoid.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Production Recommendations</div>
        <p className="text-xs text-muted-foreground mt-1">Recommendations only — production / orders are arranged separately by Anaglyph Branding.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {v.productionRecommendations.map((r) => (
            <div key={r.surface} className="rounded-md border border-border p-3">
              <div className="text-sm font-semibold">{r.surface}</div>
              <div className="text-xs text-muted-foreground">{r.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-xs text-muted-foreground inline-flex items-center gap-2">
        <Eye className="h-4 w-4" /> The client review page mirrors the sections above without internal notes, prompts, or model details.
      </div>
    </div>
  );
}

function labelStatus(s?: string | null) {
  if (s === "approve_final") return "Approved as Final";
  if (s === "minor_revision") return "Minor Revision Requested";
  if (s === "full_redesign") return "New Direction Requested";
  if (s === "pending") return "Awaiting Client Review";
  return s || "Not Sent";
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildHtmlSummary(kit: BrandKit) {
  const v = kit.publicView;
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const swatches = v.palette
    .map(
      (c) =>
        `<div style="display:inline-block;width:120px;margin:8px;text-align:center;font-family:system-ui">
          <div style="height:80px;background:${c.hex};border:1px solid #ddd;border-radius:6px"></div>
          <div style="font-size:12px;margin-top:6px"><strong>${escape(c.name || c.role)}</strong></div>
          <div style="font-size:11px;color:#666;font-family:monospace">${(c.hex || "").toUpperCase()}</div>
        </div>`,
    )
    .join("");
  const variations = (v.variations.filter(Boolean) as any[])
    .map(
      (va) =>
        `<div style="margin:12px 0">
          <h3 style="margin:0 0 4px 0">${escape(va.label)}</h3>
          <p style="margin:0 0 6px 0;color:#555;font-size:13px">${escape(va.use)}</p>
          <img src="logos/${slugify(va.label)}.png" alt="${escape(va.label)}" style="max-width:280px"/>
        </div>`,
    )
    .join("");
  const usage = Object.entries(v.usageGuide)
    .filter(([k]) => k !== "avoid")
    .map(([k, val]) => `<li><strong style="text-transform:capitalize">${k}:</strong> ${escape(String(val))}</li>`)
    .join("");
  const recs = v.productionRecommendations
    .map((r) => `<li><strong>${escape(r.surface)}:</strong> ${escape(r.note)}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(v.brand.businessName || "Brand Kit")} — Brand Kit</title>
<style>body{font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#111}
h1{font-size:32px;margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #eee;padding-bottom:6px}
.muted{color:#666}img{display:block}</style></head><body>
<h1>${escape(v.brand.businessName || "Brand Kit")}</h1>
<div class="muted">${escape(v.brand.industry || "")}</div>
${v.brand.description ? `<p>${escape(v.brand.description)}</p>` : ""}
<h2>Primary Logo</h2>
<img src="logos/primary-logo.png" alt="Primary logo" style="max-width:480px"/>
<p>${escape(v.whyThisDirection)}</p>
<h2>Logo Variations</h2>${variations || "<p class='muted'>None.</p>"}
<h2>Color Palette</h2>${swatches}
<h2>Typography</h2>
<ul>${v.typography.heading ? `<li><strong>Heading:</strong> ${escape(v.typography.heading)}</li>` : ""}${v.typography.body ? `<li><strong>Body:</strong> ${escape(v.typography.body)}</li>` : ""}${v.typography.accent ? `<li><strong>Accent:</strong> ${escape(v.typography.accent)}</li>` : ""}</ul>
<h2>Brand Usage Guide</h2><ul>${usage}</ul>
<h3>Do not</h3><ul>${v.usageGuide.avoid.map((a) => `<li>${escape(a)}</li>`).join("")}</ul>
<h2>Production Recommendations</h2><ul>${recs}</ul>
<p class="muted" style="margin-top:40px;font-size:12px">Prepared by Anaglyph Branding.</p>
</body></html>`;
}