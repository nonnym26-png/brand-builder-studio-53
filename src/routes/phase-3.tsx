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

async function fetchAsDataUrl(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  const res = await fetch(url);
  const blob = await res.blob();
  const format: "PNG" | "JPEG" = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG";
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return { dataUrl, format };
}

async function buildBrandKitPdf(d: {
  businessName: string;
  industry: string;
  slogan: string;
  brandSummary: string;
  usageNotes: string;
  productionRecs: string;
  palette: Array<{ role: string; name: string | null; hex: string | null }>;
  typography: Record<string, string>;
  logoDataUrl: { dataUrl: string; format: "PNG" | "JPEG" } | null;
  index: number;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensure = (needed: number) => {
    if (y + needed > pageH - margin - 24) {
      drawFooter();
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("ANAGLYPH BRANDING", margin, 28);
    doc.setFont("helvetica", "normal");
    doc.text("Brand Kit", pageW - margin, 28, { align: "right" });
    doc.setDrawColor(220);
    doc.line(margin, 34, pageW - margin, 34);
    doc.setTextColor(20);
  };

  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Prepared by Anaglyph Branding · ${d.businessName} · Brand Kit ${d.index + 1}`,
      pageW / 2,
      pageH - 24,
      { align: "center" },
    );
    doc.setTextColor(20);
  };

  const heading = (text: string) => {
    ensure(36);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(text, margin, y);
    y += 6;
    doc.setDrawColor(230);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  const paragraph = (text: string, size = 10) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    for (const line of lines) {
      ensure(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  drawHeader();

  // Title
  y = margin + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(d.businessName, margin, y);
  y += 18;
  if (d.industry) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(d.industry, margin, y);
    y += 14;
    doc.setTextColor(20);
  }
  if (d.slogan) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(70);
    doc.text(`"${d.slogan}"`, margin, y + 8);
    y += 22;
    doc.setTextColor(20);
  }

  // Logo
  if (d.logoDataUrl) {
    heading("Approved Logo");
    const maxW = 240;
    const maxH = 180;
    try {
      const props = doc.getImageProperties(d.logoDataUrl.dataUrl);
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      ensure(h + 8);
      doc.addImage(d.logoDataUrl.dataUrl, d.logoDataUrl.format, margin, y, w, h);
      y += h + 6;
    } catch { /* skip */ }
  }

  if (d.brandSummary) {
    heading("Brand Summary");
    paragraph(d.brandSummary);
  }

  // Palette
  if (d.palette.length > 0) {
    heading("Color Palette");
    const swatchW = 110;
    const swatchH = 60;
    const gap = 12;
    const perRow = Math.max(1, Math.floor((pageW - margin * 2 + gap) / (swatchW + gap)));
    let col = 0;
    let rowY = y;
    ensure(swatchH + 32);
    rowY = y;
    for (const c of d.palette) {
      if (col === perRow) {
        col = 0;
        y = rowY + swatchH + 32;
        ensure(swatchH + 32);
        rowY = y;
      }
      const x = margin + col * (swatchW + gap);
      const hex = (c.hex || "#cccccc").replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      doc.setFillColor(r, g, b);
      doc.setDrawColor(220);
      doc.roundedRect(x, rowY, swatchW, swatchH, 4, 4, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40);
      doc.text(c.name || c.role || "Color", x, rowY + swatchH + 12);
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text((c.hex || "").toUpperCase(), x, rowY + swatchH + 24);
      doc.setTextColor(20);
      col += 1;
    }
    y = rowY + swatchH + 32;
  }

  // Typography
  if (d.typography?.heading || d.typography?.body || d.typography?.accent) {
    heading("Typography");
    const fontRow = (label: string, name: string | undefined) => {
      if (!name) return;
      ensure(34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(label.toUpperCase(), margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(name, margin + 70, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text("AaBbCc 1234 — The quick brown fox", margin + 70, y);
      y += 14;
    };
    fontRow("Heading", d.typography.heading);
    fontRow("Body", d.typography.body);
    fontRow("Accent", d.typography.accent);
    doc.setTextColor(20);
  }

  if (d.usageNotes) {
    heading("Logo Usage Notes");
    paragraph(d.usageNotes);
  }

  heading("Logo Do's & Don'ts");
  paragraph("Do — preserve clear space around the logo equal to the height of its primary mark.");
  paragraph("Do — use the approved color palette on appropriate backgrounds for legibility.");
  paragraph("Don't — stretch, skew, recolor, or rotate the logo.");
  paragraph("Don't — place the logo on busy imagery or low-contrast backgrounds without a container.");

  const recs = d.productionRecs.split("\n").map((s) => s.trim()).filter(Boolean);
  if (recs.length > 0) {
    heading("Recommended Printing Products");
    for (const r of recs) {
      ensure(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`•  ${r}`, margin, y);
      y += 14;
    }
  }

  drawFooter();

  const safe = (d.businessName || "Brand").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Brand";
  doc.save(`${safe}-Brand-Kit-${d.index + 1}.pdf`);
}
