import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import JSZip from "jszip";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles } from "@/api/phase2.functions";
import { loadBrandKit, markBrandKitExported } from "@/api/brandKit.functions";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-3")({
  head: () => ({ meta: [{ title: "Phase 3 — AB Brand Kit Builder | Anaglyph Branding" }] }),
  component: Phase3,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null };
type BrandKit = Awaited<ReturnType<typeof loadBrandKit>>;
type LogoAsset = { id: string; image_url: string; design_type: string | null };

const GOLD = "#C9A24B";
const RED = "#C8323C";

type KitDoc = {
  // 1. Core Logo System
  coreLogoNotes: string;
  logoSlots: Array<{ label: string; dataUrl: string | null; isPrimary?: boolean }>;
  // 2. Color Palette
  paletteNotes: string;
  colors: Array<{ name: string; hex: string; usage: string }>;
  // 3. Font Selection
  fonts: Array<{ label: string; name: string; sample: string; usage: string; style?: "normal" | "italic"; big?: boolean }>;
  fontNotes: string;
  // 4. Brand Icons / Visual Elements
  iconNotes: string;
  visualElements: Array<{ title: string; explanation: string; dataUrl: string | null }>;
  // 5. Brand Application Recommendations
  applications: Array<{
    title: string;
    explanation: string;
    usage: string;
    dataUrl: string | null;
    selected: boolean;
  }>;
  // 6. Strategic Branding Process
  process: string;
  // 7. Slogan / Brand Message
  slogan: string;
  brandMessage: string;
  // 8. Why Branding Matters
  whyBranding: string;
  // 9. Final AB Brand Statement Footer
  footerStatement: string;
};

const DEFAULT_PROCESS =
  "Phase 1 — Discovery & Intake: We capture the business story, audience, and visual direction.\n" +
  "Phase 2 — Logo Generation & Refinement: We design, revise, and approve a signature mark.\n" +
  "Phase 3 — Brand Kit Delivery: We assemble the complete brand system for production-ready use.";

const DEFAULT_WHY =
  "Branding is more than a logo — it is the visual promise your business makes every time a customer sees you. " +
  "A consistent, professional brand builds trust, commands premium pricing, and turns first-time buyers into loyal advocates.";

const DEFAULT_FOOTER =
  "This Brand Kit is the official Anaglyph Branding identity system for your business. " +
  "Every element has been crafted for print, digital, signage, and apparel. Use it consistently — and your brand will speak before you do.";

function Phase3() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [doc, setDoc] = useState<KitDoc | null>(null);
  const [primaryLogo, setPrimaryLogo] = useState<LogoAsset | null>(null);

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const load = async (id: string) => {
    setSelectedId(id);
    setKit(null);
    setDoc(null);
    setPrimaryLogo(null);
    if (!id) return;
    setLoading(true);
    try {
      const data = await loadBrandKit({ data: { brandProfileId: id, admin: true } });
      setKit(data);
      const v = data.publicView;
      const logo = v.primary
        ? { id: v.primary.id, image_url: v.primary.image_url, design_type: v.primary.design_type ?? null }
        : (data.adminView?.allApprovedAssets?.[0] ?? null);
      setPrimaryLogo(logo as LogoAsset | null);

      const primaryDataUrl = logo
        ? await fetchAsDataUrl(logo.image_url).then((r) => r?.dataUrl ?? null).catch(() => null)
        : null;

      const colors = (v.palette || []).map((c) => ({
        name: c.name || c.role || "Color",
        hex: (c.hex || "#000000").toUpperCase(),
        usage: c.role === "primary"
          ? "Primary brand color — logo, headlines, hero areas."
          : c.role === "secondary"
          ? "Secondary — supporting blocks, alt logo lockups."
          : c.role === "accent"
          ? "Accent — highlights, CTAs, callouts."
          : "Neutral — backgrounds, body text, surfaces.",
      }));

      setDoc({
        coreLogoNotes:
          buildCoreLogoNotes(v),
        logoSlots: [
          { label: "Primary Logo", dataUrl: primaryDataUrl, isPrimary: true },
          { label: "Simplified Mark", dataUrl: null },
          { label: "Black Version", dataUrl: null },
          { label: "White Version", dataUrl: null },
          { label: "Icon Only", dataUrl: null },
        ],
        paletteNotes:
          "These colors form the official brand palette. Use HEX values for digital and convert to CMYK / Pantone for print. Always preserve the hierarchy: primary leads, secondary supports, accent highlights.",
        colors: colors.length
          ? colors
          : [
              { name: "Primary", hex: "#C8323C", usage: "Primary brand color." },
              { name: "Secondary", hex: "#1A1A1A", usage: "Supporting tone." },
              { name: "Accent", hex: "#C9A24B", usage: "Highlights and CTAs." },
              { name: "Neutral", hex: "#F5F5F5", usage: "Backgrounds and body text." },
            ],
        fonts: [
          {
            label: "Headline Font",
            name: v.typography?.heading || "Montserrat Bold",
            sample: "Aa Bb Cc 123",
            usage: "Use for titles, hero statements, and the logo lockup.",
            big: true,
          },
          {
            label: "Support Font",
            name: v.typography?.body || "Inter Regular",
            sample: "The quick brown fox jumps over the lazy dog.",
            usage: "Use for body copy, paragraphs, captions, and UI.",
          },
          {
            label: "Accent / Script Font",
            name: v.typography?.accent || "Playfair Display Italic",
            sample: "Editorial Accent",
            usage: "Use sparingly for editorial moments and quotes.",
            style: "italic",
          },
        ],
        fontNotes:
          "Use Heading font for titles and the logo lockup. Body font for paragraphs, captions, and UI. Accent font sparingly for editorial moments.",
        iconNotes:
          buildIconNotes(v),
        visualElements: buildVisualElements(v),
        applications: buildApplications(v),
        process: DEFAULT_PROCESS,
        slogan: pickSlogan(v),
        brandMessage:
          buildBrandMessage(v),
        whyBranding: DEFAULT_WHY,
        footerStatement: DEFAULT_FOOTER,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => { if (selectedId) await load(selectedId); };

  const update = (patch: Partial<KitDoc>) => setDoc((d) => (d ? { ...d, ...patch } : d));
  const updateColor = (i: number, patch: Partial<KitDoc["colors"][number]>) =>
    setDoc((d) => {
      if (!d) return d;
      const colors = d.colors.slice();
      colors[i] = { ...colors[i], ...patch };
      return { ...d, colors };
    });

  const businessName = kit?.publicView.brand.businessName || "Brand";
  const industry = kit?.publicView.brand.industry || "";

  const exportPdf = async () => {
    if (!kit || !doc) return;
    setExporting("pdf");
    try {
      const logoData = primaryLogo ? await fetchAsDataUrl(primaryLogo.image_url).catch(() => null) : null;
      await buildAbBrandKitPdf({ businessName, industry, doc, logoDataUrl: logoData });
      await markBrandKitExported({ data: { brandProfileId: kit.profileId } });
      toast.success("AB Brand Kit PDF downloaded");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportZip = async () => {
    if (!kit || !primaryLogo) return;
    setExporting("zip");
    try {
      const zip = new JSZip();
      const slug = (businessName || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const root = zip.folder(`${slug}-brand-kit`)!;
      try {
        const blob = await (await fetch(primaryLogo.image_url)).blob();
        const ext = (primaryLogo.image_url.split("?")[0].split(".").pop() || "png").slice(0, 4);
        root.file(`logo.${ext}`, blob);
      } catch { /* skip */ }
      root.file("README.txt", `${businessName} — Anaglyph Branding Brand Kit assets.`);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${businessName.replace(/\s+/g, "-")}-Brand-Kit.zip`;
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
              <div className="text-sm font-semibold tracking-tight">Phase 3 — AB Brand Kit Builder</div>
              <div className="text-xs text-muted-foreground">Build the official Anaglyph Branding Brand Kit. All sections editable.</div>
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

          {kit && doc && (
            <section className="space-y-2">
              <Button className="w-full" onClick={exportPdf} disabled={exporting === "pdf"}>
                {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                Export AB Brand Kit PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={exportZip} disabled={exporting === "zip" || !primaryLogo}>
                {exporting === "zip" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                Download Asset ZIP
              </Button>
            </section>
          )}

          <section className="rounded-lg border border-border bg-card p-4 text-xs space-y-2">
            <div className="font-semibold">About this Brand Kit</div>
            <p className="text-muted-foreground leading-relaxed">
              Preset AB Brand Kit template. Phase 1 + Phase 2 data auto-fill each section. Edit anything before export — the PDF mirrors the on-screen layout in the official AB style.
            </p>
          </section>
        </aside>

        <section>
          {!kit || !doc ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">Pick a project with an approved logo to build its AB Brand Kit.</p>
              <p className="text-xs mt-2">Need to approve a logo? Head to <Link to="/phase-2" className="underline">Phase 2</Link>.</p>
            </div>
          ) : (
            <BrandKitEditor
              businessName={businessName}
              industry={industry}
              doc={doc}
              update={update}
              updateColor={updateColor}
              primaryLogo={primaryLogo}
            />
          )}
        </section>
      </main>
    </div>
  );
}

/* ------------------------------- Editor UI ------------------------------- */

function BrandKitEditor({
  businessName, industry, doc, update, updateColor, primaryLogo,
}: {
  businessName: string;
  industry: string;
  doc: KitDoc;
  update: (p: Partial<KitDoc>) => void;
  updateColor: (i: number, p: Partial<KitDoc["colors"][number]>) => void;
  primaryLogo: LogoAsset | null;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "#0A0A0A", color: "#FFFFFF" }}
    >
      {/* Cover */}
      <div className="px-10 py-12 text-center border-b" style={{ borderColor: "#1F1F1F" }}>
        <div className="text-xs tracking-[0.4em]" style={{ color: GOLD }}>ANAGLYPH BRANDING</div>
        <div className="mt-6 text-4xl font-bold tracking-tight">
          <Input
            value={businessName}
            readOnly
            className="bg-transparent border-0 text-center text-4xl font-bold text-white focus-visible:ring-0"
          />
        </div>
        {industry && <div className="text-sm mt-1" style={{ color: "#999" }}>{industry}</div>}
        <div className="mt-4 inline-block px-4 py-1 text-[10px] tracking-[0.3em]" style={{ background: RED }}>
          OFFICIAL BRAND KIT
        </div>
      </div>

      {/* 1. Core Logo System */}
      <Section title="01 · Core Logo System">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {doc.logoSlots.map((slot, i) => (
            <LogoSlot
              key={i}
              slot={slot}
              dark={slot.label === "White Version"}
              onLabelChange={(label) => {
                const next = doc.logoSlots.slice();
                next[i] = { ...next[i], label };
                update({ logoSlots: next });
              }}
              onFileChange={async (file) => {
                const dataUrl = file ? await fileToDataUrl(file) : null;
                const next = doc.logoSlots.slice();
                next[i] = { ...next[i], dataUrl };
                update({ logoSlots: next });
              }}
              onClear={() => {
                const next = doc.logoSlots.slice();
                // Re-fill primary slot from approved logo if cleared
                next[i] = { ...next[i], dataUrl: null };
                update({ logoSlots: next });
              }}
            />
          ))}
        </div>
        <div className="mt-4">
          <Lbl>Logo usage note</Lbl>
          <DarkTextarea
            rows={4}
            value={doc.coreLogoNotes}
            onChange={(v) => update({ coreLogoNotes: v })}
          />
        </div>
      </Section>

      {/* 2. Color Palette */}
      <Section title="02 · Color Palette">
        <DarkTextarea rows={3} value={doc.paletteNotes} onChange={(v) => update({ paletteNotes: v })} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {doc.colors.map((c, i) => (
            <div key={i} className="rounded-lg overflow-hidden border" style={{ borderColor: "#222" }}>
              <div className="h-24" style={{ background: c.hex }} />
              <div className="p-3 space-y-1.5" style={{ background: "#111" }}>
                <DarkInput value={c.name} onChange={(v) => updateColor(i, { name: v })} />
                <DarkInput value={c.hex} onChange={(v) => updateColor(i, { hex: v.toUpperCase() })} mono />
                <DarkTextarea rows={2} value={c.usage} onChange={(v) => updateColor(i, { usage: v })} small />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 3. Font Selection */}
      <Section title="03 · Font Selection">
        <div className="grid gap-4 md:grid-cols-3">
          {doc.fonts.map((f, i) => (
            <FontSlot
              key={i}
              font={f}
              onChange={(patch) => {
                const next = doc.fonts.slice();
                next[i] = { ...next[i], ...patch };
                update({ fonts: next });
              }}
            />
          ))}
        </div>
        <DarkTextarea className="mt-4" rows={3} value={doc.fontNotes} onChange={(v) => update({ fontNotes: v })} />
      </Section>

      {/* 4. Brand Icons / Visual Elements */}
      <Section title="04 · Brand Icons / Visual Elements">
        <DarkTextarea rows={3} value={doc.iconNotes} onChange={(v) => update({ iconNotes: v })} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {doc.visualElements.map((el, i) => (
            <VisualElementSlot
              key={i}
              element={el}
              onChange={(patch) => {
                const next = doc.visualElements.slice();
                next[i] = { ...next[i], ...patch };
                update({ visualElements: next });
              }}
              onFile={async (file) => {
                const dataUrl = file ? await fileToDataUrl(file) : null;
                const next = doc.visualElements.slice();
                next[i] = { ...next[i], dataUrl };
                update({ visualElements: next });
              }}
            />
          ))}
        </div>
      </Section>

      {/* 5. Brand Application Recommendations */}
      <Section title="05 · Brand Application Recommendations">
        <DarkTextarea rows={8} value={doc.applications} onChange={(v) => update({ applications: v })} />
      </Section>

      {/* 6. Strategic Branding Process */}
      <Section title="06 · Strategic Branding Process">
        <DarkTextarea rows={6} value={doc.process} onChange={(v) => update({ process: v })} />
      </Section>

      {/* 7. Slogan / Brand Message */}
      <Section title="07 · Slogan / Brand Message">
        <div className="space-y-3">
          <div>
            <Lbl>Slogan</Lbl>
            <DarkInput value={doc.slogan} onChange={(v) => update({ slogan: v })} placeholder="Optional tagline" />
          </div>
          <div>
            <Lbl>Brand Message</Lbl>
            <DarkTextarea rows={5} value={doc.brandMessage} onChange={(v) => update({ brandMessage: v })} />
          </div>
        </div>
      </Section>

      {/* 8. Why Branding Matters */}
      <Section title="08 · Why Branding Matters">
        <DarkTextarea rows={6} value={doc.whyBranding} onChange={(v) => update({ whyBranding: v })} />
      </Section>

      {/* 9. Final AB Brand Statement Footer */}
      <div className="px-10 py-10 text-center border-t" style={{ borderColor: "#1F1F1F", background: "#000" }}>
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: GOLD }}>ANAGLYPH BRANDING</div>
        <DarkTextarea
          rows={4}
          value={doc.footerStatement}
          onChange={(v) => update({ footerStatement: v })}
          centered
        />
        <div className="mt-4 h-[2px] w-24 mx-auto" style={{ background: RED }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-10 py-8 border-t" style={{ borderColor: "#1F1F1F" }}>
      <h3 className="text-xs tracking-[0.3em] mb-4" style={{ color: GOLD }}>{title}</h3>
      <div className="rounded-lg p-5 border" style={{ background: "#0F0F0F", borderColor: "#1F1F1F" }}>
        {children}
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] tracking-[0.25em] mb-1.5" style={{ color: GOLD }}>{String(children).toUpperCase()}</div>;
}

function DarkInput({
  value, onChange, placeholder, mono,
}: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-[#2A2A2A] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:border-[${GOLD}] ${mono ? "font-mono text-xs uppercase" : ""}`}
    />
  );
}

function DarkTextarea({
  value, onChange, rows = 3, className, centered, small,
}: { value: string; onChange: (v: string) => void; rows?: number; className?: string; centered?: boolean; small?: boolean }) {
  return (
    <Textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent border-[#2A2A2A] text-white placeholder:text-zinc-600 focus-visible:ring-0 leading-relaxed ${centered ? "text-center" : ""} ${small ? "text-xs" : ""} ${className || ""}`}
    />
  );
}

type FontSlotData = KitDoc["fonts"][number];

function FontSlot({
  font, onChange,
}: { font: FontSlotData; onChange: (patch: Partial<FontSlotData>) => void }) {
  const italic = font.style === "italic";
  const big = !!font.big;
  return (
    <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "#2A2A2A", background: "#111" }}>
      <DarkInput value={font.label} onChange={(v) => onChange({ label: v })} />
      <DarkInput value={font.name} onChange={(v) => onChange({ name: v })} />
      <div
        className="mt-2 text-white border-y py-3"
        style={{
          borderColor: "#1F1F1F",
          fontSize: big ? 28 : 18,
          fontStyle: italic ? "italic" : "normal",
          fontWeight: big ? 700 : 400,
          minHeight: big ? 56 : 36,
        }}
      >
        {font.sample || "Sample"}
      </div>
      <DarkInput value={font.sample} onChange={(v) => onChange({ sample: v })} placeholder="Sample text" />
      <DarkTextarea rows={2} value={font.usage} onChange={(v) => onChange({ usage: v })} small />
    </div>
  );
}

function LogoSlot({
  slot, dark, onLabelChange, onFileChange, onClear,
}: {
  slot: { label: string; dataUrl: string | null; isPrimary?: boolean };
  dark?: boolean;
  onLabelChange: (label: string) => void;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
}) {
  const inputId = `logo-slot-${slot.label.replace(/\s+/g, "-")}`;
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#2A2A2A", background: "#111" }}>
      <div
        className="aspect-square grid place-items-center relative"
        style={{ background: dark ? "#000" : "#FFFFFF" }}
      >
        {slot.dataUrl ? (
          <img src={slot.dataUrl} alt={slot.label} className="max-h-full max-w-full object-contain p-4" />
        ) : (
          <label htmlFor={inputId} className="cursor-pointer text-center px-3 text-[11px]" style={{ color: dark ? "#888" : "#999" }}>
            <div className="font-semibold mb-1" style={{ color: dark ? "#bbb" : "#666" }}>Upload</div>
            <div>Click to add {slot.label.toLowerCase()}</div>
          </label>
        )}
        {slot.isPrimary && (
          <div className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: GOLD, color: "#000" }}>
            FROM PHASE 2
          </div>
        )}
      </div>
      <div className="p-2 space-y-1.5">
        <DarkInput value={slot.label} onChange={onLabelChange} />
        <div className="flex gap-1.5">
          <label
            htmlFor={inputId}
            className="flex-1 text-center text-[10px] tracking-wider py-1 rounded cursor-pointer border"
            style={{ borderColor: "#2A2A2A", color: GOLD }}
          >
            {slot.dataUrl ? "REPLACE" : "UPLOAD"}
          </label>
          {slot.dataUrl && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] tracking-wider py-1 px-2 rounded border"
              style={{ borderColor: "#2A2A2A", color: "#bbb" }}
            >
              CLEAR
            </button>
          )}
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

type VisualEl = KitDoc["visualElements"][number];

function VisualElementSlot({
  element, onChange, onFile,
}: {
  element: VisualEl;
  onChange: (patch: Partial<VisualEl>) => void;
  onFile: (file: File | null) => void;
}) {
  const inputId = `ve-${element.title.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#2A2A2A", background: "#111" }}>
      <div className="aspect-square grid place-items-center" style={{ background: "#FFFFFF" }}>
        {element.dataUrl ? (
          <img src={element.dataUrl} alt={element.title} className="max-h-full max-w-full object-contain p-4" />
        ) : (
          <label htmlFor={inputId} className="cursor-pointer text-center px-3 text-[11px]" style={{ color: "#999" }}>
            <div className="font-semibold mb-1" style={{ color: "#666" }}>Upload</div>
            <div>Click to add image</div>
          </label>
        )}
      </div>
      <div className="p-2 space-y-1.5">
        <DarkInput value={element.title} onChange={(v) => onChange({ title: v })} />
        <DarkTextarea rows={3} value={element.explanation} onChange={(v) => onChange({ explanation: v })} small />
        <div className="flex gap-1.5">
          <label
            htmlFor={inputId}
            className="flex-1 text-center text-[10px] tracking-wider py-1 rounded cursor-pointer border"
            style={{ borderColor: "#2A2A2A", color: GOLD }}
          >
            {element.dataUrl ? "REPLACE" : "UPLOAD"}
          </label>
          {element.dataUrl && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="text-[10px] tracking-wider py-1 px-2 rounded border"
              style={{ borderColor: "#2A2A2A", color: "#bbb" }}
            >
              CLEAR
            </button>
          )}
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

/* --------------------------------- PDF --------------------------------- */

async function fetchAsDataUrl(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  return _fetchAsDataUrl(url);
}

/* ---------------------------- Autofill helpers --------------------------- */

type PV = BrandKit["publicView"];

function buildCoreLogoNotes(v: PV): string {
  const dir = v.brand.logoDirection
    ? v.brand.logoDirection === "rework"
      ? "This logo was developed by reworking the client's existing mark."
      : "This logo was designed as a brand-new concept for the business."
    : "";
  const concept = v.phase2?.conceptNotes ? ` Concept direction: ${v.phase2.conceptNotes}.` : "";
  return [
    "The approved logo is the official mark of the brand. Maintain clear space equal to the height of the mark on all sides. Never recolor, distort, rotate, or recreate in unapproved typefaces.",
    [dir, concept].filter(Boolean).join(" ").trim(),
  ].filter(Boolean).join("\n\n");
}

function buildIconNotes(v: PV): string {
  const elements = v.phase2?.elements;
  let extra = "";
  if (elements && typeof elements === "object") {
    try {
      const list = Array.isArray(elements) ? elements : Object.values(elements as Record<string, unknown>);
      const names = list
        .map((e) => (typeof e === "string" ? e : (e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "")))
        .filter(Boolean);
      if (names.length) extra = `\n\nGenerated visual elements: ${names.join(", ")}.`;
    } catch { /* ignore */ }
  }
  return (
    "Custom brand icons follow the same line weight and corner radius as the logo. Use sparingly — icons support the message, they do not replace it. Maintain monochrome usage on busy backgrounds." +
    extra
  );
}

function buildVisualElements(v: PV): KitDoc["visualElements"] {
  const slots: KitDoc["visualElements"] = [
    { title: "Icon Concept 1", explanation: "Primary supporting icon — represents the core service.", dataUrl: null },
    { title: "Icon Concept 2", explanation: "Secondary icon — supports a key offering or feature.", dataUrl: null },
    { title: "Supporting Visual Mark", explanation: "Companion mark used alongside the primary logo for variety.", dataUrl: null },
    { title: "Mascot / Industry Graphic", explanation: "Optional character or industry-specific illustration.", dataUrl: null },
    { title: "Pattern / Brand Element", explanation: "Optional repeating pattern or texture used on packaging and collateral.", dataUrl: null },
  ];

  // Auto-fill from Phase 2 elements (array or object with images/urls)
  const collect = (val: unknown): Array<{ title?: string; description?: string; url?: string }> => {
    const out: Array<{ title?: string; description?: string; url?: string }> = [];
    const visit = (x: unknown) => {
      if (!x) return;
      if (typeof x === "string" && /^https?:\/\//.test(x)) out.push({ url: x });
      else if (Array.isArray(x)) x.forEach(visit);
      else if (typeof x === "object") {
        const o = x as Record<string, unknown>;
        const url = (o.image_url || o.imageUrl || o.url || o.src) as string | undefined;
        const title = (o.name || o.title || o.label) as string | undefined;
        const description = (o.description || o.note || o.explanation) as string | undefined;
        if (url || title || description) out.push({ url, title, description });
        Object.values(o).forEach(visit);
      }
    };
    visit(val);
    return out;
  };

  const found = [...collect(v.phase2?.elements), ...collect(v.phase2?.mascot)];
  for (let i = 0; i < slots.length && i < found.length; i++) {
    const f = found[i];
    if (f.url) slots[i].dataUrl = f.url;
    if (f.title) slots[i].title = f.title;
    if (f.description) slots[i].explanation = f.description;
  }
  return slots;
}

const APPLICATION_CATALOG: Array<{ title: string; explanation: string; usage: string }> = [
  { title: "Business Cards", explanation: "Compact, premium-feeling print piece used for in-person introductions.", usage: "Primary logo on the front; one-color or reversed mark on the back." },
  { title: "Car Magnets", explanation: "Removable branded magnets that turn personal vehicles into mobile signage.", usage: "Bold one-color logo with phone number and service area." },
  { title: "Vehicle Decals", explanation: "Permanent vinyl graphics for trucks, vans, and trailers.", usage: "Use high-contrast logo and large legible type for distance readability." },
  { title: "Embroidered Polo Shirts", explanation: "Stitched logo apparel for staff and owner-operators.", usage: "Use the embroidery-safe logo at 3–4 inches over the chest." },
  { title: "T-Shirts / Uniform Tops", explanation: "Printed brand apparel for crews, events, and giveaways.", usage: "Primary logo centered on chest or back; preserve clear space." },
  { title: "Signage", explanation: "Exterior and interior signage that anchors the brand to a location.", usage: "Use the primary logo with high contrast against the surface." },
  { title: "Social Media Presence", explanation: "Profile, cover, and post templates that present the brand consistently online.", usage: "Use the icon-only mark for avatars and primary logo for posts." },
  { title: "Website", explanation: "Information site or landing page that builds trust and captures leads.", usage: "Primary logo in the header; favicon mark in the browser tab." },
  { title: "Brochures / Flyers", explanation: "Take-away print pieces explaining services or promotions.", usage: "Lead with primary logo and brand colors; keep typography hierarchy clear." },
  { title: "Product Labels", explanation: "Branded labels applied directly to retail products.", usage: "Use the primary logo with required regulatory copy in body font." },
  { title: "Window Graphics", explanation: "Vinyl applied to storefront glass to attract walk-by traffic.", usage: "Bold one-color logo with hours and core services." },
  { title: "Menus / Service Sheets", explanation: "Customer-facing menus or service price lists.", usage: "Primary logo at top, accent color for section dividers." },
  { title: "Custom Recommendation", explanation: "An additional recommendation specific to this client.", usage: "Edit this card with a custom recommendation." },
];

function suggestApplicationTitles(v: PV): string[] {
  const setup = (v.brand.currentSetup || "").toLowerCase();
  const products = (v.brand.productsServices || "").toLowerCase();
  const text = `${setup} ${products}`;

  const isMobile = /(mobile|referral|service|no storefront|home[- ]based|on[- ]site|field)/.test(text);
  const isStorefront = /(storefront|retail|walk[- ]?in|brick|shop|boutique|salon|cafe|restaurant|store)/.test(text);
  const isProduct = /(product|packag|merch|retail item|goods|food|drink|cosmetic|bottle|label)/.test(text);

  const set = new Set<string>(["Business Cards", "Social Media Presence", "Website"]);

  if (isMobile) {
    ["Car Magnets", "Vehicle Decals", "Embroidered Polo Shirts"].forEach((t) => set.add(t));
  }
  if (isStorefront) {
    ["Signage", "Window Graphics", "Embroidered Polo Shirts", "Brochures / Flyers"].forEach((t) => set.add(t));
  }
  if (isProduct) {
    ["Product Labels", "Brochures / Flyers"].forEach((t) => set.add(t));
  }
  // Sensible default if nothing matched
  if (!isMobile && !isStorefront && !isProduct) {
    ["Embroidered Polo Shirts", "Signage", "Brochures / Flyers"].forEach((t) => set.add(t));
  }
  return Array.from(set);
}

function buildApplications(v: PV): KitDoc["applications"] {
  const suggested = new Set(suggestApplicationTitles(v));
  return APPLICATION_CATALOG.map((a) => ({
    ...a,
    dataUrl: null,
    selected: suggested.has(a.title),
  }));
}

function pickSlogan(v: PV): string {
  const s = v.phase2?.slogans as unknown;
  if (typeof s === "string" && s.trim()) return s.trim();
  if (Array.isArray(s) && s.length) {
    const first = s[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "text" in first) return String((first as { text: unknown }).text || "");
  }
  return v.brand.selectedDirection || "";
}

function buildBrandMessage(v: PV): string {
  const parts: string[] = [];
  if (v.brand.shortDescription || v.brand.description) {
    parts.push((v.brand.shortDescription || v.brand.description) as string);
  }
  if (v.brand.targetAudience) parts.push(`Built for: ${v.brand.targetAudience}.`);
  if (Array.isArray(v.brand.businessGoals) && v.brand.businessGoals.length) {
    parts.push(`Brand goals: ${v.brand.businessGoals.join(", ")}.`);
  }
  if (v.brand.currentSetup) parts.push(`Current stage: ${v.brand.currentSetup}.`);
  if (parts.length === 0) {
    return `${v.brand.businessName || "This brand"} delivers a distinctive experience built on craft, consistency, and trust.`;
  }
  return parts.join(" ");
}

async function _fetchAsDataUrl(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

async function buildAbBrandKitPdf(d: {
  businessName: string;
  industry: string;
  doc: KitDoc;
  logoDataUrl: { dataUrl: string; format: "PNG" | "JPEG" } | null;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  const [gr, gg, gb] = hexToRgb(GOLD);
  const [rr, rg, rb] = hexToRgb(RED);

  let y = 0;
  let pageNum = 0;

  const startPage = (cover = false) => {
    if (pageNum > 0) pdf.addPage();
    pageNum += 1;
    // Black background
    pdf.setFillColor(10, 10, 10);
    pdf.rect(0, 0, pageW, pageH, "F");
    if (!cover) {
      // Header
      pdf.setTextColor(gr, gg, gb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("ANAGLYPH BRANDING", margin, 28);
      pdf.setTextColor(180, 180, 180);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${d.businessName}`.toUpperCase(), pageW - margin, 28, { align: "right" });
      pdf.setDrawColor(60, 60, 60);
      pdf.line(margin, 36, pageW - margin, 36);
      // Footer
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(8);
      pdf.text("Official Brand Kit · Anaglyph Branding", pageW / 2, pageH - 22, { align: "center" });
      pdf.setFillColor(rr, rg, rb);
      pdf.rect(margin, pageH - 14, 32, 2, "F");
      y = 60;
    }
  };

  const ensure = (needed: number) => {
    if (y + needed > pageH - 50) startPage();
  };

  const sectionHeader = (title: string) => {
    ensure(50);
    pdf.setTextColor(gr, gg, gb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(title.toUpperCase(), margin, y);
    pdf.setDrawColor(gr, gg, gb);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y + 6, margin + 60, y + 6);
    pdf.setLineWidth(0.2);
    y += 22;
  };

  const paragraph = (text: string, opts?: { color?: [number, number, number]; size?: number; italic?: boolean }) => {
    if (!text) return;
    const size = opts?.size ?? 10;
    const c = opts?.color ?? [230, 230, 230];
    pdf.setTextColor(c[0], c[1], c[2]);
    pdf.setFont("helvetica", opts?.italic ? "italic" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, contentW);
    for (const line of lines) {
      ensure(size + 4);
      pdf.text(line, margin, y);
      y += size + 4;
    }
    y += 4;
  };

  /* Cover */
  startPage(true);
  pdf.setTextColor(gr, gg, gb);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("ANAGLYPH BRANDING", pageW / 2, 120, { align: "center", charSpace: 4 });
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(34);
  pdf.text(d.businessName, pageW / 2, pageH / 2 - 40, { align: "center" });
  if (d.industry) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(180, 180, 180);
    pdf.text(d.industry, pageW / 2, pageH / 2 - 18, { align: "center" });
  }
  // Red badge
  pdf.setFillColor(rr, rg, rb);
  const badgeW = 160;
  const badgeH = 22;
  pdf.rect((pageW - badgeW) / 2, pageH / 2, badgeW, badgeH, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("OFFICIAL BRAND KIT", pageW / 2, pageH / 2 + 14, { align: "center", charSpace: 3 });

  // Logo on cover
  if (d.logoDataUrl) {
    try {
      const props = pdf.getImageProperties(d.logoDataUrl.dataUrl);
      const maxW = 200;
      const maxH = 160;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      // White card
      const cardPad = 16;
      pdf.setFillColor(255, 255, 255);
      pdf.rect((pageW - w) / 2 - cardPad, pageH / 2 + 50, w + cardPad * 2, h + cardPad * 2, "F");
      pdf.addImage(d.logoDataUrl.dataUrl, d.logoDataUrl.format, (pageW - w) / 2, pageH / 2 + 50 + cardPad, w, h);
    } catch { /* skip */ }
  }
  pdf.setTextColor(120, 120, 120);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Prepared by Anaglyph Branding", pageW / 2, pageH - 60, { align: "center" });

  /* Section 1 — Core Logo System */
  startPage();
  sectionHeader("01 · Core Logo System");
  {
    const slots = d.doc.logoSlots;
    const cols = 5;
    const gap = 10;
    const slotW = (contentW - gap * (cols - 1)) / cols;
    const slotH = slotW;
    ensure(slotH + 30);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const x = margin + i * (slotW + gap);
      const dark = s.label === "White Version";
      pdf.setFillColor(dark ? 0 : 255, dark ? 0 : 255, dark ? 0 : 255);
      pdf.rect(x, y, slotW, slotH, "F");
      if (s.dataUrl) {
        try {
          const props = pdf.getImageProperties(s.dataUrl);
          const pad = 8;
          const ratio = Math.min((slotW - pad * 2) / props.width, (slotH - pad * 2) / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          const fmt: "PNG" | "JPEG" = s.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          pdf.addImage(s.dataUrl, fmt, x + (slotW - w) / 2, y + (slotH - h) / 2, w, h);
        } catch { /* skip */ }
      } else {
        pdf.setTextColor(160, 160, 160);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text("[ placeholder ]", x + slotW / 2, y + slotH / 2, { align: "center" });
      }
      pdf.setTextColor(gr, gg, gb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(s.label.toUpperCase(), x, y + slotH + 12);
    }
    y += slotH + 26;
  }
  paragraph(d.doc.coreLogoNotes);

  /* Section 2 — Color Palette */
  sectionHeader("02 · Color Palette");
  paragraph(d.doc.paletteNotes);
  const swW = (contentW - 12 * 3) / 4;
  const swH = 70;
  ensure(swH + 60);
  for (let i = 0; i < d.doc.colors.length; i++) {
    const col = i % 4;
    if (col === 0 && i !== 0) y += swH + 60;
    if (col === 0) ensure(swH + 60);
    const c = d.doc.colors[i];
    const [cr, cg, cb] = hexToRgb(c.hex);
    const x = margin + col * (swW + 12);
    pdf.setFillColor(cr, cg, cb);
    pdf.rect(x, y, swW, swH, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(c.name.toUpperCase(), x, y + swH + 12);
    pdf.setFont("courier", "normal");
    pdf.setTextColor(gr, gg, gb);
    pdf.setFontSize(8);
    pdf.text(c.hex.toUpperCase(), x, y + swH + 24);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    const usageLines = pdf.splitTextToSize(c.usage, swW);
    pdf.text(usageLines.slice(0, 3), x, y + swH + 34);
  }
  y += swH + 60;

  /* Section 3 — Fonts */
  sectionHeader("03 · Font Selection");
  const fontBlock = (label: string, name: string, sample: string, usage: string, italic = false, big = false) => {
    ensure(60);
    pdf.setTextColor(gr, gg, gb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(label.toUpperCase(), margin, y);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(name, margin + 70, y);
    pdf.setFont("helvetica", italic ? "italic" : "normal");
    pdf.setFontSize(big ? 18 : 13);
    pdf.setTextColor(220, 220, 220);
    pdf.text(sample, margin + 70, y + 18);
    y += 36;
    if (usage) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(170, 170, 170);
      const lines = pdf.splitTextToSize(usage, contentW - 70);
      pdf.text(lines, margin + 70, y);
      y += lines.length * 10 + 6;
    }
  };
  for (const f of d.doc.fonts) {
    fontBlock(f.label, f.name, f.sample, f.usage, f.style === "italic", !!f.big);
  }
  paragraph(d.doc.fontNotes);

  /* Section 4 — Icons */
  sectionHeader("04 · Brand Icons / Visual Elements");
  paragraph(d.doc.iconNotes);
  {
    const cols = 5;
    const gap = 10;
    const slotW = (contentW - gap * (cols - 1)) / cols;
    const slotH = slotW;
    const blockH = slotH + 70;
    ensure(blockH);
    const rowY = y;
    for (let i = 0; i < d.doc.visualElements.length; i++) {
      const el = d.doc.visualElements[i];
      const x = margin + i * (slotW + gap);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, rowY, slotW, slotH, "F");
      if (el.dataUrl) {
        try {
          const props = pdf.getImageProperties(el.dataUrl);
          const pad = 8;
          const ratio = Math.min((slotW - pad * 2) / props.width, (slotH - pad * 2) / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          const fmt: "PNG" | "JPEG" = el.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          pdf.addImage(el.dataUrl, fmt, x + (slotW - w) / 2, rowY + (slotH - h) / 2, w, h);
        } catch { /* skip */ }
      } else {
        pdf.setTextColor(160, 160, 160);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text("[ placeholder ]", x + slotW / 2, rowY + slotH / 2, { align: "center" });
      }
      pdf.setTextColor(gr, gg, gb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text((el.title || "").toUpperCase(), x, rowY + slotH + 12, { maxWidth: slotW });
      pdf.setTextColor(200, 200, 200);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      const lines = pdf.splitTextToSize(el.explanation || "", slotW);
      pdf.text(lines.slice(0, 4), x, rowY + slotH + 22);
    }
    y = rowY + blockH;
  }

  /* Section 5 — Applications */
  sectionHeader("05 · Brand Application Recommendations");
  for (const line of d.doc.applications.split("\n").map((s) => s.trim()).filter(Boolean)) {
    ensure(16);
    pdf.setTextColor(rr, rg, rb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("•", margin, y);
    pdf.setTextColor(230, 230, 230);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(line, contentW - 14);
    pdf.text(lines, margin + 12, y);
    y += lines.length * 13 + 4;
  }

  /* Section 6 — Process */
  sectionHeader("06 · Strategic Branding Process");
  paragraph(d.doc.process);

  /* Section 7 — Slogan / Brand Message */
  sectionHeader("07 · Slogan / Brand Message");
  if (d.doc.slogan) {
    ensure(28);
    pdf.setTextColor(gr, gg, gb);
    pdf.setFont("helvetica", "bolditalic");
    pdf.setFontSize(16);
    pdf.text(`"${d.doc.slogan}"`, margin, y);
    y += 22;
  }
  paragraph(d.doc.brandMessage);

  /* Section 8 — Why */
  sectionHeader("08 · Why Branding Matters");
  paragraph(d.doc.whyBranding);

  /* Section 9 — Footer */
  startPage();
  pdf.setTextColor(gr, gg, gb);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("ANAGLYPH BRANDING", pageW / 2, pageH / 2 - 40, { align: "center", charSpace: 4 });
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const footLines = pdf.splitTextToSize(d.doc.footerStatement, contentW - 40);
  let fy = pageH / 2;
  for (const line of footLines) {
    pdf.text(line, pageW / 2, fy, { align: "center" });
    fy += 16;
  }
  pdf.setFillColor(rr, rg, rb);
  pdf.rect(pageW / 2 - 20, fy + 12, 40, 3, "F");
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(8);
  pdf.text(`${d.businessName} · Official Brand Kit`, pageW / 2, fy + 36, { align: "center" });

  const safe = (d.businessName || "Brand").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Brand";
  pdf.save(`${safe}-AB-Brand-Kit.pdf`);
}
