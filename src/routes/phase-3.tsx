import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import JSZip from "jszip";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles } from "@/api/phase2.functions";
import { loadBrandKit, markBrandKitExported } from "@/api/brandKit.functions";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-3")({
  head: () => ({ meta: [{ title: "Phase 3 — Brand Kit Builder | Anaglyph Branding" }] }),
  component: Phase3,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null };
type BrandKit = Awaited<ReturnType<typeof loadBrandKit>>;
type LogoAsset = { id: string; image_url: string; design_type: string | null };

const MAX_KITS = 3;

type KitEdits = {
  brandSummary: string;
  slogan: string;
  usageNotes: string;
  productionRecs: string;
};

function Phase3() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, KitEdits>>({});

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const load = async (id: string) => {
    setSelectedId(id);
    setKit(null);
    setEdits({});
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

  const refresh = async () => { if (selectedId) await load(selectedId); };

  // Build up to MAX_KITS approved logos to turn into kits
  const approvedLogos = useMemo<LogoAsset[]>(() => {
    if (!kit?.adminView) return [];
    const all = kit.adminView.allApprovedAssets || [];
    const seen = new Set<string>();
    const list: LogoAsset[] = [];
    if (kit.publicView.primary) {
      list.push({
        id: kit.publicView.primary.id,
        image_url: kit.publicView.primary.image_url,
        design_type: kit.publicView.primary.design_type ?? null,
      });
      seen.add(kit.publicView.primary.id);
    }
    for (const a of all) {
      if (seen.has(a.id)) continue;
      list.push({ id: a.id, image_url: a.image_url, design_type: a.design_type });
      seen.add(a.id);
      if (list.length >= MAX_KITS) break;
    }
    return list.slice(0, MAX_KITS);
  }, [kit]);

  const getEdits = (logoId: string): KitEdits => {
    if (edits[logoId]) return edits[logoId];
    const v = kit?.publicView;
    return {
      brandSummary: v?.brand.description || "",
      slogan: v?.brand.selectedDirection || "",
      usageNotes: v?.usageGuide?.primary || "",
      productionRecs: (v?.productionRecommendations || []).map((r) => `${r.surface}: ${r.note}`).join("\n"),
    };
  };

  const setEdit = (logoId: string, patch: Partial<KitEdits>) => {
    setEdits((e) => ({ ...e, [logoId]: { ...getEdits(logoId), ...patch } }));
  };

  const exportKit = async (logo: LogoAsset, index: number) => {
    if (!kit) return;
    setExporting(logo.id);
    try {
      const v = kit.publicView;
      const e = getEdits(logo.id);
      const logoData = await fetchAsDataUrl(logo.image_url).catch(() => null);
      await buildBrandKitPdf({
        businessName: v.brand.businessName || "Brand",
        industry: v.brand.industry || "",
        slogan: e.slogan,
        brandSummary: e.brandSummary,
        usageNotes: e.usageNotes,
        productionRecs: e.productionRecs,
        palette: v.palette,
        typography: v.typography,
        logoDataUrl: logoData,
        index,
      });
      await markBrandKitExported({ data: { brandProfileId: kit.profileId } });
      toast.success("Brand kit PDF downloaded");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportAssetZip = async (logo: LogoAsset, index: number) => {
    if (!kit) return;
    setExporting(logo.id + ":zip");
    try {
      const v = kit.publicView;
      const zip = new JSZip();
      const slug = (v.brand.businessName || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const root = zip.folder(`${slug}-assets-${index + 1}`)!;
      try {
        const blob = await (await fetch(logo.image_url)).blob();
        const ext = (logo.image_url.split("?")[0].split(".").pop() || "png").slice(0, 4);
        root.file(`logo.${ext}`, blob);
      } catch { /* skip */ }
      root.file("README.txt", `${v.brand.businessName || "Brand"} — logo asset bundle.\nGenerated by Anaglyph Branding.`);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(v.brand.businessName || "brand").replace(/\s+/g, "-")}-Assets-${index + 1}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Asset export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Phase 3 — Brand Kit Builder</div>
              <div className="text-xs text-muted-foreground">Build and export a brand kit for each approved logo (max {MAX_KITS}).</div>
            </div>
          </div>
          <PhaseStepper current="/phase-3" completed={{ "/phase-3": Boolean(kit?.adminView?.brandKitExportedAt) }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
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
            {kit && (
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={refresh} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4 text-xs space-y-2">
            <div className="font-semibold">How Phase 3 works</div>
            <p className="text-muted-foreground leading-relaxed">
              One brand kit per approved logo, up to {MAX_KITS}. Each kit auto-fills business name, logo, colors, fonts, and slogan. Edit the brand summary, usage notes, and production recommendations, then export as a ZIP containing the logo and a printable HTML brand guide.
            </p>
          </section>
        </aside>

        <section className="space-y-6">
          {!kit ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">Pick a project with approved logos to build its brand kit.</p>
              <p className="text-xs mt-2">Need to approve logos? Head to <Link to="/phase-2" className="underline">Phase 2</Link>.</p>
            </div>
          ) : approvedLogos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">No approved logos yet for this project.</p>
              <p className="text-xs mt-2">Approve up to 3 logos in <Link to="/phase-2" className="underline">Phase 2</Link>.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Brand Overview</div>
                <h1 className="text-2xl font-semibold mt-1">{kit.publicView.brand.businessName}</h1>
                {kit.publicView.brand.industry && <div className="text-sm text-muted-foreground">{kit.publicView.brand.industry}</div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{approvedLogos.length} approved logo{approvedLogos.length === 1 ? "" : "s"}</Badge>
                  <Badge variant="outline">{kit.publicView.palette.length} colors</Badge>
                  {kit.adminView?.brandKitExportedAt && (
                    <Badge variant="outline"><Download className="h-3 w-3 mr-1" />Exported</Badge>
                  )}
                </div>
              </div>

              {approvedLogos.map((logo, i) => (
                <BrandKitCard
                  key={logo.id}
                  index={i}
                  logo={logo}
                  kit={kit}
                  edits={getEdits(logo.id)}
                  onChange={(p) => setEdit(logo.id, p)}
                  onExport={() => exportKit(logo, i)}
                  onExportZip={() => exportAssetZip(logo, i)}
                  exporting={exporting === logo.id}
                  exportingZip={exporting === logo.id + ":zip"}
                />
              ))}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function BrandKitCard({
  index, logo, kit, edits, onChange, onExport, onExportZip, exporting, exportingZip,
}: {
  index: number;
  logo: LogoAsset;
  kit: BrandKit;
  edits: KitEdits;
  onChange: (p: Partial<KitEdits>) => void;
  onExport: () => void;
  onExportZip: () => void;
  exporting: boolean;
  exportingZip: boolean;
}) {
  const v = kit.publicView;
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Brand Kit {index + 1}</div>
          <div className="text-lg font-semibold">{v.brand.businessName}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
            Save Brand Kit as PDF
          </Button>
          <Button variant="outline" onClick={onExportZip} disabled={exportingZip}>
            {exportingZip ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download Asset ZIP
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="rounded-lg bg-muted/40 grid place-items-center aspect-square overflow-hidden">
          <img src={logo.image_url} alt={`Approved logo ${index + 1}`} className="max-h-full max-w-full object-contain p-6" />
        </div>

        <div className="space-y-4">
          <div>
            <Label>Slogan</Label>
            <Input className="mt-1.5" value={edits.slogan} onChange={(e) => onChange({ slogan: e.target.value })} placeholder="Optional tagline for this kit" />
          </div>
          <div>
            <Label>Brand summary</Label>
            <Textarea className="mt-1.5" rows={3} value={edits.brandSummary} onChange={(e) => onChange({ brandSummary: e.target.value })} />
          </div>
        </div>
      </div>

      {v.palette.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Color palette</div>
          <div className="grid gap-2 sm:grid-cols-4">
            {v.palette.map((c) => (
              <div key={c.hex!} className="rounded-lg border border-border overflow-hidden">
                <div className="h-16" style={{ background: c.hex! }} />
                <div className="p-2">
                  <div className="text-xs font-medium">{c.name || c.role}</div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(v.typography?.heading || v.typography?.body) && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Typography</div>
          <div className="text-sm space-y-1">
            {v.typography.heading && <div><span className="text-muted-foreground">Heading:</span> <strong>{v.typography.heading}</strong></div>}
            {v.typography.body && <div><span className="text-muted-foreground">Body:</span> <strong>{v.typography.body}</strong></div>}
            {v.typography.accent && <div><span className="text-muted-foreground">Accent:</span> <strong>{v.typography.accent}</strong></div>}
          </div>
        </div>
      )}

      <div>
        <Label>Logo usage notes</Label>
        <Textarea className="mt-1.5" rows={3} value={edits.usageNotes} onChange={(e) => onChange({ usageNotes: e.target.value })} />
      </div>

      <div>
        <Label>Recommended printing products (one per line)</Label>
        <Textarea className="mt-1.5" rows={4} value={edits.productionRecs} onChange={(e) => onChange({ productionRecs: e.target.value })} />
      </div>
    </div>
  );
}

function buildHtmlKit(d: {
  businessName: string;
  industry: string;
  slogan: string;
  brandSummary: string;
  usageNotes: string;
  productionRecs: string;
  palette: Array<{ role: string; name: string | null; hex: string | null }>;
  typography: Record<string, string>;
  logoFile: string;
}) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const swatches = d.palette.map((c) => `
    <div style="display:inline-block;width:140px;margin:8px;text-align:center">
      <div style="height:80px;background:${c.hex};border:1px solid #ddd;border-radius:6px"></div>
      <div style="font-size:13px;margin-top:6px"><strong>${esc(c.name || c.role)}</strong></div>
      <div style="font-size:11px;color:#666;font-family:monospace">${(c.hex || "").toUpperCase()}</div>
    </div>`).join("");
  const recs = d.productionRecs.split("\n").filter(Boolean).map((r) => `<li>${esc(r)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.businessName)} — Brand Kit</title>
<style>body{font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#111}
h1{font-size:32px;margin:0 0 4px}h2{margin-top:32px;border-bottom:1px solid #eee;padding-bottom:6px}
.muted{color:#666}img{display:block;max-width:360px}</style></head><body>
<h1>${esc(d.businessName)}</h1>
<div class="muted">${esc(d.industry)}</div>
${d.slogan ? `<p style="font-style:italic;margin-top:8px">"${esc(d.slogan)}"</p>` : ""}
<h2>Logo</h2>
<img src="${esc(d.logoFile)}" alt="Logo" />
${d.brandSummary ? `<h2>Brand Summary</h2><p>${esc(d.brandSummary)}</p>` : ""}
<h2>Color Palette</h2>${swatches}
<h2>Typography</h2><ul>
${d.typography.heading ? `<li><strong>Heading:</strong> ${esc(d.typography.heading)}</li>` : ""}
${d.typography.body ? `<li><strong>Body:</strong> ${esc(d.typography.body)}</li>` : ""}
${d.typography.accent ? `<li><strong>Accent:</strong> ${esc(d.typography.accent)}</li>` : ""}
</ul>
${d.usageNotes ? `<h2>Logo Usage</h2><p>${esc(d.usageNotes)}</p>` : ""}
${recs ? `<h2>Recommended Printing Products</h2><ul>${recs}</ul>` : ""}
<p class="muted" style="margin-top:48px;font-size:12px">Prepared by Anaglyph Branding.</p>
</body></html>`;
}
