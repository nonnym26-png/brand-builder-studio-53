import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Package, Database, FileImage, FileText } from "lucide-react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles, loadBrandProfile, markPhaseComplete } from "@/api/phase2.functions";
import { ConceptMark } from "@/components/brand-kit/ConceptRenderer";
import { exportConceptPDF } from "@/components/brand-kit/exportConceptPdf";
import type { LogoConcept } from "@/components/brand-kit/conceptTypes";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-3")({
  head: () => ({ meta: [{ title: "Phase 3 — Brand Kit | AB Brand Kit" }] }),
  component: Phase3,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null };

const VARIANTS = [
  { mode: "light" as const, label: "Primary (Light)" },
  { mode: "dark" as const, label: "Dark" },
  { mode: "brand" as const, label: "Brand Color" },
  { mode: "mono" as const, label: "One-Color" },
  { mode: "white" as const, label: "Reverse" },
];

function Phase3() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const load = async (id: string) => {
    setSelectedId(id);
    if (!id) return;
    const row = await loadBrandProfile({ data: { id } });
    setProfile(row as Record<string, unknown> | null);
  };

  const concept = (profile?.selected_logo_concept as LogoConcept | null) ?? null;
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const downloadSVG = (mode: typeof VARIANTS[number]["mode"]) => {
    const node = refs.current[mode]?.querySelector("svg");
    if (!node) { toast.error("No SVG to export"); return; }
    const xml = new XMLSerializer().serializeToString(node);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(concept?.brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-${mode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllZip = async () => {
    if (!concept) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      const slug = (concept.brandName || "brand").toLowerCase().replace(/\s+/g, "-");
      // SVGs
      for (const v of VARIANTS) {
        const node = refs.current[v.mode]?.querySelector("svg");
        if (node) zip.file(`svg/${slug}-${v.mode}.svg`, new XMLSerializer().serializeToString(node));
      }
      // PNGs
      for (const v of VARIANTS) {
        const el = refs.current[v.mode];
        if (!el) continue;
        const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true });
        zip.file(`png/${slug}-${v.mode}.png`, dataUrl.split(",")[1], { base64: true });
      }
      // Manifest
      zip.file("brand-manifest.json", JSON.stringify({
        brandName: concept.brandName,
        palette: concept.palette,
        typography: { heading: concept.headingFont, body: concept.subFont },
        markType: concept.markType,
        generatedAt: new Date().toISOString(),
      }, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${slug}-brand-kit.zip`; a.click();
      URL.revokeObjectURL(url);
      if (selectedId) await markPhaseComplete({ data: { id: selectedId, phase: 3 } });
      toast.success("Brand kit exported");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadDossierPDF = async () => {
    if (!concept) return;
    setBusy(true);
    try {
      const opts = { pixelRatio: 2, cacheBust: true };
      const pngs = {
        light: await toPng(refs.current.light!, opts),
        dark: await toPng(refs.current.dark!, opts),
        brand: await toPng(refs.current.brand!, opts),
        mono: await toPng(refs.current.mono!, opts),
        mark: await toPng(refs.current.light!, opts),
      };
      await exportConceptPDF(concept, pngs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Phase 3 — Finalize Brand Kit</div>
              <div className="text-xs text-muted-foreground">Export SVG, PNG and PDF assets.</div>
            </div>
          </div>
          <PhaseStepper current="/phase-3" completed={{ "/phase-3": Boolean(profile?.phase_3_completed_at) }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Profile
            </h2>
            <Select value={selectedId} onValueChange={load}>
              <SelectTrigger><SelectValue placeholder="Pick a profile" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.business_name || "Untitled"} · {p.client_name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {concept ? (
            <>
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Final palette</h3>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {(["primary", "secondary", "accent", "dark", "light"] as const).map((k) => (
                    <div key={k} className="space-y-1">
                      <div className="h-10 rounded border border-border" style={{ background: concept.palette[k] }} />
                      <div className="text-[9px] uppercase text-muted-foreground">{k}</div>
                      <div className="text-[9px] font-mono">{concept.palette[k].toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Typography</h3>
                <div className="mt-3 space-y-2">
                  <div style={{ fontFamily: concept.headingFont, fontWeight: concept.headingWeight }} className="text-2xl">Heading</div>
                  <div style={{ fontFamily: concept.subFont, fontWeight: concept.subWeight }} className="text-sm text-muted-foreground">Body / supporting text</div>
                </div>
              </section>

              <div className="space-y-2">
                <Button onClick={downloadAllZip} disabled={busy} className="w-full">
                  <Package className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Building…" : "Download Brand Kit (ZIP)"}
                </Button>
                <Button onClick={downloadDossierPDF} disabled={busy} variant="outline" className="w-full">
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Brand Dossier PDF
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
              Select a profile that has a chosen concept from <Link to="/phase-2" className="underline">Phase 2</Link>.
            </div>
          )}
        </aside>

        <section className="space-y-6">
          {concept ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{concept.brandName}</h1>
                  <p className="text-sm text-muted-foreground">{concept.name} · <Badge variant="outline" className="text-[10px] uppercase">{concept.markType}</Badge></p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {VARIANTS.map((v) => (
                  <div key={v.mode} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{v.label}</div>
                      <button onClick={() => downloadSVG(v.mode)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                        <FileImage className="h-3 w-3" /> SVG
                      </button>
                    </div>
                    <div ref={(el) => { refs.current[v.mode] = el; }} className="overflow-hidden rounded-md">
                      <ConceptMark concept={concept} mode={v.mode} size={420} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold tracking-tight">Brand kit contents</h3>
                <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <li>· 5 logo variations as SVG (vector)</li>
                  <li>· 5 logo variations as PNG (2× retina)</li>
                  <li>· Brand dossier PDF (palette, type, lockups)</li>
                  <li>· Manifest JSON (palette + typography metadata)</li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <Button onClick={downloadAllZip} disabled={busy}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download Full Brand Kit
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">Pick a profile with a selected logo concept to assemble its brand kit.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}