import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Database, Download, Loader2, RefreshCw, Sparkles,
  Search, Compass, Palette, Package, Layers, Eye,
  Award, ShieldCheck, Briefcase, Plus, X, Save,
} from "lucide-react";
import JSZip from "jszip";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles } from "@/api/phase2.functions";
import { loadBrandKit, markBrandKitExported, savePhase3KitData, loadPhase3KitData } from "@/api/brandKit.functions";
import abLogo from "@/assets/ab-logo.png";
import { getStoredProjectId, storeProjectId } from "@/lib/selected-project";
import { SavedProfilesPicker } from "@/components/SavedProfilesPicker";

export const Route = createFileRoute("/phase-3")({
  head: () => ({ meta: [{ title: "Phase 3 — AB Brand Kit Builder | Anaglyph Branding" }] }),
  component: Phase3,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null };
type BrandKit = Awaited<ReturnType<typeof loadBrandKit>>;
type LogoAsset = { id: string; image_url: string; design_type: string | null };

// Official Anaglyph Branding Phase-3 palette: Red (primary), Blue (secondary),
// Black + White (support), Gray (neutral). No gold accents.
const RED = "#C92222";
const BLUE = "#1F4FA8";
// Backwards-compat alias so the rest of this file (and the PDF chrome)
// keeps working without renaming every reference.
// Per latest brand direction: all former "gold" accents are now RED.
const GOLD = RED;

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
  processSteps: Array<{ title: string; explanation: string; icon: ProcessIconKey }>;
  // 7. Slogan / Brand Message
  slogans: Array<{ headline: string; explanation: string }>;
  // 8. Why Branding Matters
  whyBlocks: Array<{ title: string; explanation: string; icon: WhyIconKey }>;
  // 9. Final AB Brand Statement Footer
  footerBusinessName: string;
  footerBusinessType: string;
  footerProjectNote: string;
};

const AB_STATEMENT = "WE DESIGN THE BRAND FIRST, THEN BUILD THE MATERIALS THAT MAKE IT VISIBLE.";

type ProcessIconKey = "search" | "compass" | "palette" | "package" | "layers" | "eye";
type WhyIconKey = "award" | "shield" | "briefcase";

const PROCESS_ICONS: Record<ProcessIconKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  search: Search, compass: Compass, palette: Palette, package: Package, layers: Layers, eye: Eye,
};
const WHY_ICONS: Record<WhyIconKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  award: Award, shield: ShieldCheck, briefcase: Briefcase,
};

const DEFAULT_PROCESS: KitDoc["processSteps"] = [
  { icon: "search",   title: "Discovery",          explanation: "We capture the business story, audience, market, and visual direction." },
  { icon: "compass",  title: "Strategy",           explanation: "We define positioning, tone, and the visual language that will guide every decision." },
  { icon: "palette",  title: "Identity Design",    explanation: "We design a signature logo system, color palette, and typography built for recognition." },
  { icon: "package",  title: "Brand Assets",       explanation: "We deliver every approved logo lockup, color, font, and supporting visual element." },
  { icon: "layers",   title: "Applications",       explanation: "We extend the brand into print, signage, apparel, vehicles, packaging, and digital." },
  { icon: "eye",      title: "Visibility & Trust", explanation: "We position the brand to be seen, remembered, and chosen by the right customers." },
];

const DEFAULT_WHY: KitDoc["whyBlocks"] = [
  { icon: "award",     title: "Recognition",          explanation: "A consistent visual identity makes your business instantly recognisable across every touchpoint — print, digital, signage, and apparel." },
  { icon: "shield",    title: "Trust",                explanation: "Customers trust brands that look intentional. A professional identity signals quality, credibility, and longevity." },
  { icon: "briefcase", title: "Professional Presence",explanation: "A complete brand system positions you alongside the most established names in your industry — and commands premium pricing." },
];

function Phase3() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [doc, setDoc] = useState<KitDoc | null>(null);
  const [primaryLogo, setPrimaryLogo] = useState<LogoAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
    const stored = getStoredProjectId();
    if (stored) load(stored).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (id: string) => {
    setSelectedId(id);
    storeProjectId(id);
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

      // Map Phase 2 uploaded logos (Main / Abbreviated / Icon / Black / White / Additional) into the kit slots.
      const uploaded = (v as unknown as { uploadedLogos?: Record<string, string> }).uploadedLogos || {};
      const fetchSlot = async (key: string) => {
        const url = uploaded[key];
        if (!url) return null;
        const r = await fetchAsDataUrl(url).catch(() => null);
        return r?.dataUrl ?? null;
      };
      const [mainData, abbrData, iconData, blackData, whiteData, additionalData] = await Promise.all([
        fetchSlot("main"),
        fetchSlot("abbreviated"),
        fetchSlot("icon"),
        fetchSlot("black"),
        fetchSlot("white"),
        fetchSlot("additional"),
      ]);

      const colors = (v.palette || []).map((c) => ({
        name: c.name || c.role || "Color",
        hex: (c.hex || "#000000").toUpperCase(),
        usage: c.note && String(c.note).trim()
          ? String(c.note)
          : c.role === "primary"
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
          (mainData ?? primaryDataUrl) ? { label: "Main Logo", dataUrl: mainData ?? primaryDataUrl, isPrimary: true } : null,
          abbrData ? { label: "Abbreviated Logo", dataUrl: abbrData } : null,
          iconData ? { label: "Icon Logo", dataUrl: iconData } : null,
          blackData ? { label: "Black Logo", dataUrl: blackData } : null,
          whiteData ? { label: "White Logo", dataUrl: whiteData } : null,
          additionalData ? { label: "Additional Logo", dataUrl: additionalData } : null,
        ].filter(Boolean) as Array<{ label: string; dataUrl: string | null; isPrimary?: boolean }>,
        paletteNotes:
          "These colors form the official brand palette. Use HEX values for digital and convert to CMYK / Pantone for print. Always preserve the hierarchy: primary leads, secondary supports, accent highlights.",
        colors: colors.length
          ? colors
          : [
              { name: "Primary Red", hex: "#C92222", usage: "Primary brand color — logo, headlines, callouts." },
              { name: "Secondary Blue", hex: "#1F4FA8", usage: "Secondary brand color — supporting blocks, highlights." },
              { name: "Support Black", hex: "#111111", usage: "Strong contrast — typography and dark surfaces." },
              { name: "Neutral Gray", hex: "#9D9D9D", usage: "Borders, cards, and background separation." },
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
        processSteps: DEFAULT_PROCESS.map((s) => ({ ...s })),
        slogans: buildSlogans(v),
        whyBlocks: DEFAULT_WHY.map((b) => ({ ...b })),
        footerBusinessName: v.brand.businessName || "",
        footerBusinessType: v.brand.industry || "",
        footerProjectNote: "",
      });

      // Merge in any previously saved Phase 3 progress so users don't lose edits.
      try {
        const saved = await loadPhase3KitData({ data: { brandProfileId: id } });
        if (saved?.data && typeof saved.data === "object") {
          const savedData = saved.data as Partial<KitDoc>;
          setDoc((d) => {
            if (!d) return d;
            const merged: KitDoc = { ...d, ...savedData };
            // Preserve freshly fetched logo data — saved snapshots can have
            // stale null dataUrls that would hide logos uploaded in Phase 2.
            if (Array.isArray(savedData.logoSlots)) {
              const freshByLabel = new Map(d.logoSlots.map((s) => [s.label, s]));
              merged.logoSlots = savedData.logoSlots.map((s) => {
                if (s?.dataUrl) return s;
                const fresh = freshByLabel.get(s?.label);
                return fresh && fresh.dataUrl ? { ...s, ...fresh } : s;
              });
              // Append any fresh slots not present in saved.
              for (const fresh of d.logoSlots) {
                if (fresh.dataUrl && !savedData.logoSlots.find((s) => s?.label === fresh.label)) {
                  merged.logoSlots.push(fresh);
                }
              }
            }
            return merged;
          });
        }
        setSavedAt(saved?.savedAt ?? null);
      } catch { /* ignore */ }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => { if (selectedId) await load(selectedId); };

  const saveProgress = async () => {
    if (!kit || !doc) return;
    setSaving(true);
    try {
      const r = await savePhase3KitData({ data: { brandProfileId: kit.profileId, data: doc } });
      setSavedAt(r.savedAt);
      toast.success("Brand Kit progress saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

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
      const abLogoData = await fetchAsDataUrl(abLogo).catch(() => null);
      await buildAbBrandKitPdf({ businessName, industry, doc, logoDataUrl: logoData, abLogoDataUrl: abLogoData });
      await markBrandKitExported({ data: { brandProfileId: kit.profileId } });
      toast.success("Brand Kit PDF downloaded.");
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
            <img src={abLogo} alt="Anaglyph Branding" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight">Anaglyph Branding</div>
              <div className="text-[11px] text-muted-foreground">Phase 3 — Official Brand Kit Builder</div>
            </div>
          </div>
          <PhaseStepper current="/phase-3" completed={{ "/phase-3": Boolean(kit?.adminView?.brandKitExportedAt) }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Pick a Saved Profile
            </h2>
            <SavedProfilesPicker
              profiles={profiles}
              selectedId={selectedId}
              onSelect={load}
              onDeleted={(ids) => {
                setProfiles((rows) => rows.filter((r) => !ids.includes(r.id)));
                if (ids.includes(selectedId)) {
                  setSelectedId("");
                  setKit(null);
                  setDoc(null);
                  setPrimaryLogo(null);
                  storeProjectId("");
                }
              }}
            />
            {kit && (
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={refresh} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            )}
          </section>

          {kit && doc && (
            <section className="space-y-2">
              <Button
                className="w-full"
                style={{ background: RED, color: "#fff" }}
                onClick={saveProgress}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Brand Kit Progress
              </Button>
              <Button className="w-full" onClick={exportPdf} disabled={exporting === "pdf"}>
                {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                Save Brand Kit as PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={exportZip} disabled={exporting === "zip" || !primaryLogo}>
                {exporting === "zip" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                Download Asset ZIP
              </Button>
              {savedAt && (
                <div className="text-[10px] text-muted-foreground text-center">
                  Last saved {new Date(savedAt).toLocaleString()}
                </div>
              )}
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
        <div className="inline-flex items-center justify-center gap-3">
          <img src={abLogo} alt="Anaglyph Branding" className="h-8 w-auto" />
          <span className="text-base font-bold tracking-tight" style={{ color: "#fff" }}>
            Anaglyph Branding
          </span>
        </div>
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
        {(() => {
          const shown = doc.logoSlots.map((slot, i) => ({ slot, i })).filter(({ slot }) => !!slot.dataUrl);
          return shown.length === 0 ? (
            <div className="text-xs italic" style={{ color: "#888" }}>
              No logos uploaded yet. Upload logos in Phase 2 to populate this section.
            </div>
          ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {shown.map(({ slot, i }) => (
            <LogoSlot
              key={i}
              slot={slot}
              dark={slot.label === "White Logo"}
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
          );
        })()}
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
        {(() => {
          const shown = doc.visualElements
            .map((el, i) => ({ el, i }))
            .filter(({ el }) => !!el.dataUrl);
          return shown.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {shown.map(({ el, i }) => (
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
                  onRemove={() => {
                    const next = doc.visualElements.slice();
                    next.splice(i, 1);
                    update({ visualElements: next });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 text-xs italic" style={{ color: "#888" }}>
              No visual elements added yet. Click below to add one.
            </div>
          );
        })()}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              const next = doc.visualElements.slice();
              next.push({ title: "Visual Element", explanation: "", dataUrl: null });
              update({ visualElements: next });
            }}
            className="inline-flex items-center gap-1.5 text-[11px] tracking-wider py-1.5 px-3 rounded border"
            style={{ borderColor: GOLD, color: GOLD }}
          >
            <Plus className="h-3 w-3" /> ADD VISUAL ELEMENT
          </button>
        </div>
      </Section>

      {/* 5. Brand Application Recommendations */}
      <Section title="05 · Brand Application Recommendations">
        <div className="text-xs mb-3" style={{ color: "#999" }}>
          Only included recommendations appear here and in the exported PDF. Add or remove items to keep the kit clean.
        </div>
        {(() => {
          const shown = doc.applications.map((app, i) => ({ app, i })).filter(({ app }) => app.selected);
          return shown.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map(({ app, i }) => (
                <ApplicationCard
                  key={i}
                  app={app}
                  onChange={(patch) => {
                    const next = doc.applications.slice();
                    next[i] = { ...next[i], ...patch };
                    update({ applications: next });
                  }}
                  onFile={async (file) => {
                    const dataUrl = file ? await fileToDataUrl(file) : null;
                    const next = doc.applications.slice();
                    next[i] = { ...next[i], dataUrl };
                    update({ applications: next });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: "#888" }}>
              No recommendations included yet. Add one below.
            </div>
          );
        })()}
        <ApplicationPicker doc={doc} update={update} />
      </Section>

      {/* 6. Strategic Branding Process */}
      <Section title="06 · Strategic Branding Process">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {doc.processSteps.map((step, i) => {
            const Icon = PROCESS_ICONS[step.icon];
            return (
              <div key={i} className="rounded-lg border p-4 space-y-2" style={{ borderColor: "#2A2A2A", background: "#111" }}>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 grid place-items-center rounded" style={{ background: "#000", border: `1px solid ${GOLD}` }}>
                    <Icon className="h-4 w-4" style={{ color: GOLD }} />
                  </div>
                  <div className="text-[10px] tracking-[0.25em]" style={{ color: GOLD }}>STEP {String(i + 1).padStart(2, "0")}</div>
                </div>
                <DarkInput value={step.title} onChange={(v) => {
                  const next = doc.processSteps.slice(); next[i] = { ...next[i], title: v }; update({ processSteps: next });
                }} />
                <DarkTextarea rows={3} value={step.explanation} small onChange={(v) => {
                  const next = doc.processSteps.slice(); next[i] = { ...next[i], explanation: v }; update({ processSteps: next });
                }} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* 7. Slogan / Brand Message */}
      <Section title="07 · Slogan / Brand Message">
        <div className="grid gap-4 md:grid-cols-2">
          {doc.slogans.map((s, i) => (
            <div key={i} className="rounded-lg border p-5 space-y-3" style={{ borderColor: "#2A2A2A", background: "#111" }}>
              <div className="text-[10px] tracking-[0.25em]" style={{ color: GOLD }}>OPTION {i + 1}</div>
              <div className="text-2xl font-bold leading-tight" style={{ color: "#fff" }}>
                <DarkInput value={s.headline} placeholder="Slogan headline" onChange={(v) => {
                  const next = doc.slogans.slice(); next[i] = { ...next[i], headline: v }; update({ slogans: next });
                }} />
              </div>
              <div>
                <Lbl>Why it fits</Lbl>
                <DarkTextarea rows={4} value={s.explanation} onChange={(v) => {
                  const next = doc.slogans.slice(); next[i] = { ...next[i], explanation: v }; update({ slogans: next });
                }} small />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 8. Why Branding Matters */}
      <Section title="08 · Why Branding Matters">
        <div className="grid gap-3 md:grid-cols-3">
          {doc.whyBlocks.map((b, i) => {
            const Icon = WHY_ICONS[b.icon];
            return (
              <div key={i} className="rounded-lg border p-5 space-y-3 text-center" style={{ borderColor: "#2A2A2A", background: "#111" }}>
                <div className="mx-auto h-12 w-12 grid place-items-center rounded-full" style={{ background: "#000", border: `1px solid ${GOLD}` }}>
                  <Icon className="h-5 w-5" style={{ color: GOLD }} />
                </div>
                <DarkInput value={b.title} onChange={(v) => {
                  const next = doc.whyBlocks.slice(); next[i] = { ...next[i], title: v }; update({ whyBlocks: next });
                }} />
                <DarkTextarea rows={4} value={b.explanation} small centered onChange={(v) => {
                  const next = doc.whyBlocks.slice(); next[i] = { ...next[i], explanation: v }; update({ whyBlocks: next });
                }} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* 9. Final AB Brand Statement Footer */}
      <div className="px-10 py-12 text-center border-t" style={{ borderColor: "#1F1F1F", background: "#000" }}>
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <img src={abLogo} alt="Anaglyph Branding" className="h-7 w-auto" />
          <span className="text-sm font-bold tracking-tight" style={{ color: "#fff" }}>
            Anaglyph Branding
          </span>
        </div>
        <div className="mx-auto max-w-3xl text-2xl md:text-3xl font-bold leading-tight tracking-tight" style={{ color: "#fff" }}>
          {AB_STATEMENT}
        </div>
        <div className="mt-5 h-[2px] w-24 mx-auto" style={{ background: RED }} />
        <div className="mt-6 grid gap-3 md:grid-cols-2 max-w-2xl mx-auto text-left">
          <div>
            <Lbl>Business Name</Lbl>
            <DarkInput value={doc.footerBusinessName} onChange={(v) => update({ footerBusinessName: v })} />
          </div>
          <div>
            <Lbl>Business Type / Industry</Lbl>
            <DarkInput value={doc.footerBusinessType} onChange={(v) => update({ footerBusinessType: v })} />
          </div>
          <div className="md:col-span-2">
            <Lbl>Project Note (optional)</Lbl>
            <DarkTextarea rows={3} value={doc.footerProjectNote} onChange={(v) => update({ footerProjectNote: v })} />
          </div>
        </div>
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
  element, onChange, onFile, onRemove,
}: {
  element: VisualEl;
  onChange: (patch: Partial<VisualEl>) => void;
  onFile: (file: File | null) => void;
  onRemove?: () => void;
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
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[10px] tracking-wider py-1 px-2 rounded border"
              style={{ borderColor: "#2A2A2A", color: "#bbb" }}
              title="Remove this slot"
            >
              <X className="h-3 w-3" />
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

type AppCardData = KitDoc["applications"][number];

function ApplicationPicker({
  doc, update,
}: {
  doc: KitDoc;
  update: (p: Partial<KitDoc>) => void;
}) {
  const available = doc.applications.map((a, i) => ({ a, i })).filter(({ a }) => !a.selected);
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {available.map(({ a, i }) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            const next = doc.applications.slice();
            next[i] = { ...next[i], selected: true };
            update({ applications: next });
          }}
          className="inline-flex items-center gap-1.5 text-[11px] tracking-wider py-1.5 px-3 rounded border"
          style={{ borderColor: "#2A2A2A", color: GOLD }}
        >
          <Plus className="h-3 w-3" /> {a.title.toUpperCase()}
        </button>
      ))}
      {available.length === 0 && (
        <div className="text-xs italic" style={{ color: "#888" }}>All recommendations included.</div>
      )}
    </div>
  );
}

function ApplicationCard({
  app, onChange, onFile,
}: {
  app: AppCardData;
  onChange: (patch: Partial<AppCardData>) => void;
  onFile: (file: File | null) => void;
}) {
  const inputId = `app-${app.title.replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <div
      className="rounded-lg border overflow-hidden flex flex-col"
      style={{
        borderColor: app.selected ? GOLD : "#2A2A2A",
        background: app.selected ? "#141008" : "#0F0F0F",
        opacity: app.selected ? 1 : 0.7,
      }}
    >
      <label className="flex items-center justify-between gap-2 px-3 py-2 border-b cursor-pointer" style={{ borderColor: "#1F1F1F" }}>
        <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase" style={{ color: app.selected ? GOLD : "#888" }}>
          <input
            type="checkbox"
            checked={app.selected}
            onChange={(e) => onChange({ selected: e.target.checked })}
            className="accent-current"
          />
          {app.selected ? "Included" : "Excluded"}
        </div>
      </label>
      <div className="aspect-[4/3] grid place-items-center" style={{ background: "#FFFFFF" }}>
        {app.dataUrl ? (
          <img src={app.dataUrl} alt={app.title} className="max-h-full max-w-full object-contain p-3" />
        ) : (
          <label htmlFor={inputId} className="cursor-pointer text-center px-3 text-[11px]" style={{ color: "#999" }}>
            <div className="font-semibold mb-1" style={{ color: "#666" }}>Mockup</div>
            <div>Click to upload image</div>
          </label>
        )}
      </div>
      <div className="p-3 space-y-2 flex-1">
        <DarkInput value={app.title} onChange={(v) => onChange({ title: v })} />
        <div>
          <Lbl>Explanation</Lbl>
          <DarkTextarea rows={2} value={app.explanation} onChange={(v) => onChange({ explanation: v })} small />
        </div>
        <div>
          <Lbl>Usage note</Lbl>
          <DarkTextarea rows={2} value={app.usage} onChange={(v) => onChange({ usage: v })} small />
        </div>
        <div className="flex gap-1.5">
          <label
            htmlFor={inputId}
            className="flex-1 text-center text-[10px] tracking-wider py-1 rounded cursor-pointer border"
            style={{ borderColor: "#2A2A2A", color: GOLD }}
          >
            {app.dataUrl ? "REPLACE" : "UPLOAD MOCKUP"}
          </label>
          {app.dataUrl && (
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
    ? /rework/i.test(v.brand.logoDirection)
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

function buildSlogans(v: PV): KitDoc["slogans"] {
  const list: string[] = [];
  const s = v.phase2?.slogans as unknown;
  if (typeof s === "string" && s.trim()) list.push(s.trim());
  else if (Array.isArray(s)) {
    for (const item of s) {
      if (typeof item === "string" && item.trim()) list.push(item.trim());
      else if (item && typeof item === "object" && "text" in item) {
        const t = String((item as { text: unknown }).text || "").trim();
        if (t) list.push(t);
      }
    }
  }
  if (v.brand.selectedDirection && !list.includes(v.brand.selectedDirection)) {
    list.push(v.brand.selectedDirection);
  }
  const business = v.brand.businessName || "Your Brand";
  const fallback = [
    { headline: `${business}. Built to be remembered.`, explanation: "Anchors the brand around recognition and longevity — speaks to customers who value quality and consistency." },
    { headline: `${business}. Designed for trust.`,     explanation: "Positions the brand as a credible, professional choice — supports premium pricing and repeat business." },
  ];
  const out: KitDoc["slogans"] = [];
  for (let i = 0; i < 2; i++) {
    if (list[i]) out.push({ headline: list[i], explanation: fallback[i].explanation });
    else out.push(fallback[i]);
  }
  return out;
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
  abLogoDataUrl?: { dataUrl: string; format: "PNG" | "JPEG" } | null;
}) {
  // Premium AB-branded Brand Kit modeled on the Lady J Consulting reference.
  // Black background, white content cards, RED + GOLD accents, numbered sections.
  const pdf = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;
  // Per brand update: replace all gold accents with red. We keep the
  // (gr, gg, gb) variable names so the rest of this builder doesn't need
  // a wide rename — they now hold the official Anaglyph RED.
  const GOLD_HEX = RED;
  const [gr, gg, gb] = hexToRgb(GOLD_HEX);
  const [rr, rg, rb] = hexToRgb(RED);
  let pageNum = 0;

  // Comfortable default line-height across the document so bullets and
  // paragraphs never collide. Individual sections can still override.
  pdf.setLineHeightFactor(1.45);

  const drawBg = () => {
    pdf.setFillColor(8, 8, 10);
    pdf.rect(0, 0, pageW, pageH, "F");
  };
  const drawFooter = () => {
    // Bottom AB statement bar
    const fy = pageH - 56;
    pdf.setFillColor(rr, rg, rb);
    pdf.rect(margin, fy, contentW, 28, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(AB_STATEMENT, pageW / 2, fy + 18, { align: "center" });
    // Tiny credit line
    pdf.setTextColor(160, 160, 160);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    const credit = `${d.doc.footerBusinessName || d.businessName || "Brand"}  ·  Professional branding by Anaglyph Branding  ·  Page ${pageNum}`;
    pdf.text(credit, pageW / 2, pageH - 14, { align: "center" });
  };
  const newPage = () => {
    if (pageNum > 0) {
      drawFooter();
      pdf.addPage();
    }
    pageNum += 1;
    drawBg();
  };

  // Numbered section header bar (gold border + gold tab with white text)
  const sectionHeader = (n: string, title: string, x: number, yy: number, w: number) => {
    // Outer gold border tab
    pdf.setDrawColor(gr, gg, gb);
    pdf.setLineWidth(0.7);
    pdf.roundedRect(x, yy, w, 18, 2, 2, "S");
    // Tab label fill
    const labelW = Math.min(220, w * 0.55);
    pdf.setFillColor(gr, gg, gb);
    pdf.roundedRect(x, yy, labelW, 18, 2, 2, "F");
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(`${n}.  ${title.toUpperCase()}`, x + 8, yy + 12, { charSpace: 0.6 });
  };

  // White card with subtle gold border
  const card = (x: number, yy: number, w: number, h: number) => {
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(gr, gg, gb);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, yy, w, h, 4, 4, "FD");
  };

  /* ============== PAGE 1 — Header + Logo System + Palette ============== */
  newPage();

  // Top header band: AB logo left | title block right
  const headerH = 96;
  // Left logo well
  const logoWellW = 150;
  if (d.abLogoDataUrl) {
    try {
      const props = pdf.getImageProperties(d.abLogoDataUrl.dataUrl);
      const ratio = Math.min((logoWellW - 16) / props.width, (headerH - 16) / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      pdf.addImage(d.abLogoDataUrl.dataUrl, d.abLogoDataUrl.format, margin + (logoWellW - w) / 2, margin + (headerH - h) / 2, w, h);
    } catch { /* skip */ }
  }
  // Vertical gold divider
  pdf.setDrawColor(gr, gg, gb);
  pdf.setLineWidth(1);
  pdf.line(margin + logoWellW + 8, margin + 6, margin + logoWellW + 8, margin + headerH - 6);

  const tx = margin + logoWellW + 22;
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text((d.businessName || "Your Brand").toUpperCase(), tx, margin + 22, { charSpace: 1 });
  pdf.setFontSize(20);
  pdf.text("NEW BUSINESS IDENTITY", tx, margin + 46, { charSpace: 0.5 });
  pdf.setTextColor(gr, gg, gb);
  pdf.setFontSize(36);
  pdf.text("BRANDING ", tx, margin + 80);
  const bw = pdf.getTextWidth("BRANDING ");
  pdf.setTextColor(rr, rg, rb);
  pdf.text("KIT", tx + bw, margin + 80);
  pdf.setTextColor(220, 220, 220);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("Built to strengthen recognition, trust, and a professional brand presence.", tx, margin + 94);

  let y = margin + headerH + 14;

  /* ----- Section 1: Core Logo System ----- */
  const slots = d.doc.logoSlots.filter((s) => !!s.dataUrl);
  const colors = d.doc.colors.filter((c) => c.hex && /^#[0-9a-f]{3,6}$/i.test(c.hex.trim()));

  // Two-column row: logos card (left, ~62%) + palette card (right)
  const row1H = 180;
  const lw = contentW * 0.62 - 6;
  const rw = contentW - lw - 12;

  // LOGO SYSTEM CARD
  sectionHeader("1", "Core Logo System", margin, y, lw);
  card(margin, y + 22, lw, row1H - 22);
  if (slots.length > 0) {
    const inner = { x: margin + 10, y: y + 30, w: lw - 20, h: row1H - 22 - 16 };
    const cols = Math.min(slots.length, 5);
    const gap = 8;
    const slotW = (inner.w - gap * (cols - 1)) / cols;
    const slotH = inner.h - 28;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const col = i % cols;
      const x = inner.x + col * (slotW + gap);
      const cy = inner.y + 4;
      const dark = /white/i.test(s.label);
      if (dark) { pdf.setFillColor(15, 15, 15); pdf.rect(x, cy, slotW, slotH, "F"); }
      try {
        const props = pdf.getImageProperties(s.dataUrl!);
        const pad = 8;
        const ratio = Math.min((slotW - pad * 2) / props.width, (slotH - pad * 2) / props.height);
        const w = props.width * ratio;
        const h = props.height * ratio;
        const fmt: "PNG" | "JPEG" = s.dataUrl!.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        pdf.addImage(s.dataUrl!, fmt, x + (slotW - w) / 2, cy + (slotH - h) / 2, w, h);
      } catch { /* skip */ }
      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text(s.label.toUpperCase(), x + slotW / 2, cy + slotH + 12, { align: "center", charSpace: 0.4 });
    }
  }
  if (d.doc.coreLogoNotes && d.doc.coreLogoNotes.trim()) {
    pdf.setTextColor(70, 70, 70);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7.5);
    const lines = pdf.splitTextToSize(d.doc.coreLogoNotes.trim(), lw - 24);
    pdf.text(lines.slice(0, 2), margin + lw / 2, y + row1H - 6, { align: "center" });
  }

  // PALETTE CARD
  const px = margin + lw + 12;
  sectionHeader("2", "Color Palette", px, y, rw);
  card(px, y + 22, rw, row1H - 22);
  if (colors.length > 0) {
    const inner = { x: px + 10, y: y + 32, w: rw - 20, h: row1H - 56 };
    const cols = Math.min(colors.length, 5);
    const gap = 6;
    const swW = (inner.w - gap * (cols - 1)) / cols;
    const swH = inner.h - 36;
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      const [cr, cg, cb] = hexToRgb(c.hex);
      const x = inner.x + i * (swW + gap);
      pdf.setFillColor(cr, cg, cb);
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.rect(x, inner.y, swW, swH, "FD");
      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      const nm = pdf.splitTextToSize((c.name || "").toUpperCase(), swW);
      pdf.text(nm.slice(0, 2), x + swW / 2, inner.y + swH + 9, { align: "center" });
      pdf.setFont("courier", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(120, 120, 120);
      pdf.text(c.hex.toUpperCase(), x + swW / 2, inner.y + swH + 22, { align: "center" });
    }
  }
  if (d.doc.paletteNotes && d.doc.paletteNotes.trim()) {
    pdf.setTextColor(70, 70, 70);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7);
    const lines = pdf.splitTextToSize(d.doc.paletteNotes.trim(), rw - 24);
    pdf.text(lines.slice(0, 2), px + rw / 2, y + row1H - 4, { align: "center" });
  }

  y += row1H + 14;

  /* ----- Section 3 + 4: Fonts (left) + Visual Elements (right) ----- */
  const fonts = d.doc.fonts.filter((f) => (f.name && f.name.trim()) || (f.sample && f.sample.trim()));
  // Only show visual element cards that have an actual uploaded/generated image.
  const visEls = d.doc.visualElements.filter((e) => !!e.dataUrl);

  const row2H = 190;
  const fw = contentW * 0.40 - 6;
  const vw = contentW - fw - 12;

  // FONTS CARD
  if (fonts.length > 0) {
    sectionHeader("3", "Font Selection", margin, y, fw);
    card(margin, y + 22, fw, row2H - 22);
    let fy2 = y + 36;
    for (const f of fonts) {
      const blockH = (row2H - 30) / fonts.length;
      // Big "Aa" preview on left
      pdf.setTextColor(30, 30, 30);
      pdf.setFont("helvetica", f.style === "italic" ? "bolditalic" : "bold");
      pdf.setFontSize(28);
      pdf.text("Aa", margin + 14, fy2 + blockH / 2 + 2);
      // Label + name
      pdf.setTextColor(rr, rg, rb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text((f.label || "").toUpperCase(), margin + 60, fy2 + 6, { charSpace: 0.5 });
      pdf.setTextColor(20, 20, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(f.name || "—", margin + 60, fy2 + 18);
      pdf.setFont("helvetica", f.style === "italic" ? "italic" : "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(90, 90, 90);
      pdf.text(pdf.splitTextToSize(f.sample || "", fw - 70).slice(0, 1), margin + 60, fy2 + 30);
      fy2 += blockH;
    }
    if (d.doc.fontNotes && d.doc.fontNotes.trim()) {
      pdf.setTextColor(70, 70, 70);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7);
      pdf.text(pdf.splitTextToSize(d.doc.fontNotes, fw - 24).slice(0, 2), margin + fw / 2, y + row2H - 6, { align: "center" });
    }
  }

  // VISUAL ELEMENTS CARD
  if (visEls.length > 0) {
    sectionHeader("4", "Brand Icons / Visual Elements", margin + fw + 12, y, vw);
    card(margin + fw + 12, y + 22, vw, row2H - 22);
    const inner = { x: margin + fw + 22, y: y + 32, w: vw - 20, h: row2H - 56 };
    const cols = Math.min(visEls.length, 2);
    const gap = 10;
    const cardW = (inner.w - gap * (cols - 1)) / cols;
    for (let i = 0; i < Math.min(visEls.length, 2); i++) {
      const el = visEls[i];
      const x = inner.x + (i % cols) * (cardW + gap);
      const cy = inner.y;
      const imgH = inner.h - 40;
      pdf.setFillColor(245, 245, 245);
      pdf.rect(x, cy, cardW, imgH, "F");
      if (el.dataUrl) {
        try {
          const props = pdf.getImageProperties(el.dataUrl);
          const pad = 8;
          const ratio = Math.min((cardW - pad * 2) / props.width, (imgH - pad * 2) / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          const fmt: "PNG" | "JPEG" = el.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          pdf.addImage(el.dataUrl, fmt, x + (cardW - w) / 2, cy + (imgH - h) / 2, w, h);
        } catch { /* skip */ }
      }
      pdf.setTextColor(rr, rg, rb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(`CONCEPT OPTION ${i + 1}`, x + cardW / 2, cy + imgH + 12, { align: "center" });
      if (el.title) {
        pdf.setTextColor(20, 20, 20);
        pdf.setFontSize(8);
        pdf.text(el.title, x + cardW / 2, cy + imgH + 22, { align: "center" });
      }
      if (el.explanation) {
        pdf.setTextColor(80, 80, 80);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.text(pdf.splitTextToSize(el.explanation, cardW - 8).slice(0, 2), x + cardW / 2, cy + imgH + 32, { align: "center" });
      }
    }
    if (d.doc.iconNotes && d.doc.iconNotes.trim()) {
      pdf.setTextColor(70, 70, 70);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(6.5);
      pdf.text(pdf.splitTextToSize(d.doc.iconNotes, vw - 24).slice(0, 1), margin + fw + 12 + vw / 2, y + row2H - 4, { align: "center" });
    }
  }

  // Advance y past the fonts/visual row so Section 5 can sit at the bottom of page 1.
  y += row2H + 14;

  /* ----- Section 5: Brand Application Recommendations (anchored to bottom of page 1) ----- */
  const apps = d.doc.applications.filter((a) => a.selected && a.dataUrl);
  if (apps.length > 0) {
    const cardsH = 150;
    const HEADER_H_P1 = 22;
    // Anchor to bottom of page 1 (leave room for footer).
    const FOOTER_SAFE_P1 = 70;
    const py1 = pageH - FOOTER_SAFE_P1 - cardsH - HEADER_H_P1;
    sectionHeader("5", "Brand Application Recommendations", margin, py1, contentW);
    card(margin, py1 + HEADER_H_P1, contentW, cardsH - HEADER_H_P1);
    const inner = { x: margin + 12, y: py1 + 32, w: contentW - 24, h: cardsH - 50 };
    const maxCols = Math.min(apps.length, 5);
    const gap = 10;
    const cardW = (inner.w - gap * (maxCols - 1)) / maxCols;
    const imgH = inner.h - 30;
    for (let i = 0; i < Math.min(apps.length, 5); i++) {
      const a = apps[i];
      const x = inner.x + i * (cardW + gap);
      pdf.setFillColor(20, 20, 20);
      pdf.rect(x, inner.y, cardW, imgH, "F");
      if (a.dataUrl) {
        try {
          const props = pdf.getImageProperties(a.dataUrl);
          const pad = 4;
          const ratio = Math.min((cardW - pad * 2) / props.width, (imgH - pad * 2) / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          const fmt: "PNG" | "JPEG" = a.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          pdf.addImage(a.dataUrl, fmt, x + (cardW - w) / 2, inner.y + (imgH - h) / 2, w, h);
        } catch { /* skip */ }
      }
      pdf.setTextColor(rr, rg, rb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(`${i + 1}.`, x, inner.y + imgH + 14);
      pdf.setTextColor(20, 20, 20);
      pdf.text(pdf.splitTextToSize((a.title || "").toUpperCase(), cardW - 12).slice(0, 2), x + 12, inner.y + imgH + 14);
    }
  }

  /* ============== PAGE 2 — Process + Slogans + Why ============== */
  const slogans = d.doc.slogans.filter((s) => s.headline && s.headline.trim());
  const why = d.doc.whyBlocks.filter((w) => w.title?.trim() || w.explanation?.trim());
  const process = d.doc.processSteps.filter((p) => p.title?.trim());

  if (slogans.length > 0 || why.length > 0 || process.length > 0) {
    newPage();
    let py = margin + 6;

    // Safe area: space available before footer (footer band starts at pageH - 56)
    const FOOTER_SAFE = 70;
    const SECTION_GAP = 14;
    const HEADER_H = 22; // section header tab height + gap before card
    const CARD_PAD = 14;

    const ensureSpace = (needed: number) => {
      if (py + needed > pageH - FOOTER_SAFE) {
        drawFooter();
        pdf.addPage();
        pageNum += 1;
        drawBg();
        py = margin + 6;
      }
    };

    /* ----- Section 6: Strategic Branding Process ----- */
    if (process.length > 0) {
      // Measure: each step needs title (1 line) + description (up to 4 lines)
      const cols = process.length;
      const stepW = (contentW - 28) / cols;
      let maxDescLines = 0;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      for (const p of process) {
        const lines = pdf.splitTextToSize(p.explanation || "", stepW - 10).length;
        if (lines > maxDescLines) maxDescLines = lines;
      }
      const descLines = Math.min(maxDescLines, 6);
      // badge(28) + title(14) + desc(descLines * 8) + bottom pad(14)
      const cardBodyH = 28 + 16 + descLines * 8 + 14;
      const totalH = HEADER_H + cardBodyH;
      ensureSpace(totalH);
      sectionHeader("6", "The Strategic Branding Process", margin, py, contentW);
      card(margin, py + HEADER_H, contentW, cardBodyH);
      const inner = { x: margin + 14, y: py + HEADER_H + CARD_PAD, w: contentW - 28, h: cardBodyH - CARD_PAD * 2 };
      for (let i = 0; i < cols; i++) {
        const p = process[i];
        const cx = inner.x + i * stepW + stepW / 2;
        pdf.setFillColor(rr, rg, rb);
        pdf.circle(cx, inner.y + 10, 9, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(String(i + 1), cx, inner.y + 13, { align: "center" });
        if (i < cols - 1) {
          pdf.setDrawColor(gr, gg, gb);
          pdf.setLineWidth(0.5);
          pdf.line(cx + 12, inner.y + 10, cx + stepW - 12, inner.y + 10);
        }
        pdf.setTextColor(20, 20, 20);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(pdf.splitTextToSize(p.title.toUpperCase(), stepW - 8).slice(0, 2), cx, inner.y + 30, { align: "center", charSpace: 0.4 });
        pdf.setTextColor(80, 80, 80);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        const lines = pdf.splitTextToSize(p.explanation || "", stepW - 10).slice(0, descLines);
        pdf.text(lines, cx, inner.y + 44, { align: "center" });
      }
      py += totalH + SECTION_GAP;
    }

    /* ----- Section 7: Slogan / Brand Message (full width, dynamic height) ----- */
    if (slogans.length > 0) {
      const cols = Math.min(slogans.length, 2);
      const gap = 12;
      const inner = { x: margin + 14, w: contentW - 28 };
      const subW = (inner.w - gap * (cols - 1)) / cols;
      // Measure tallest slogan column
      let maxH = 0;
      pdf.setFontSize(10);
      for (let i = 0; i < cols; i++) {
        const s = slogans[i];
        const headLines = pdf.splitTextToSize(s.headline.toUpperCase(), subW).length;
        pdf.setFontSize(7);
        const explLines = s.explanation ? pdf.splitTextToSize(s.explanation, subW).length : 0;
        // label tab(18) + headline(headLines * 12) + gap(6) + expl(explLines * 9)
        const colH = 18 + 6 + headLines * 12 + (explLines ? 6 + explLines * 9 : 0);
        if (colH > maxH) maxH = colH;
      }
      const cardBodyH = maxH + CARD_PAD * 2;
      const totalH = HEADER_H + cardBodyH;
      ensureSpace(totalH);
      sectionHeader("7", "Slogan / Brand Message", margin, py, contentW);
      card(margin, py + HEADER_H, contentW, cardBodyH);
      const innerY = py + HEADER_H + CARD_PAD;
      for (let i = 0; i < cols; i++) {
        const s = slogans[i];
        const x = inner.x + i * (subW + gap);
        pdf.setFillColor(rr, rg, rb);
        pdf.roundedRect(x, innerY, 64, 14, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(`OPTION ${i + 1}`, x + 32, innerY + 9, { align: "center" });
        pdf.setTextColor(20, 20, 20);
        pdf.setFontSize(10);
        const headLines = pdf.splitTextToSize(s.headline.toUpperCase(), subW);
        pdf.text(headLines, x, innerY + 28);
        if (s.explanation) {
          pdf.setTextColor(80, 80, 80);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          const explLines = pdf.splitTextToSize(s.explanation, subW);
          pdf.text(explLines, x, innerY + 28 + headLines.length * 12 + 8);
        }
      }
      py += totalH + SECTION_GAP;
    }

    /* ----- Section 8: Why Branding Matters — vertical stack of clean rows ----- */
    if (why.length > 0) {
      const inner = { x: margin + 14, w: contentW - 28 };
      const iconColW = 40;
      const textW = inner.w - iconColW - 8;
      const rowGap = 10;
      // Measure each row
      const rowMeasures = why.map((b) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        const titleLines = pdf.splitTextToSize((b.title || "").toUpperCase(), textW).length || 1;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        const bodyLines = b.explanation ? pdf.splitTextToSize(b.explanation, textW).length : 0;
        const h = Math.max(40, titleLines * 12 + 4 + bodyLines * 10 + 8);
        return { titleLines, bodyLines, h };
      });
      const rowsTotal = rowMeasures.reduce((sum, m) => sum + m.h, 0) + rowGap * (why.length - 1);
      const cardBodyH = rowsTotal + CARD_PAD * 2;
      const totalH = HEADER_H + cardBodyH;
      ensureSpace(totalH);
      sectionHeader("8", "Why Branding Matters", margin, py, contentW);
      card(margin, py + HEADER_H, contentW, cardBodyH);
      let ry = py + HEADER_H + CARD_PAD;
      for (let i = 0; i < why.length; i++) {
        const b = why[i];
        const m = rowMeasures[i];
        // Red dot/icon column
        pdf.setFillColor(rr, rg, rb);
        pdf.circle(inner.x + 12, ry + 10, 7, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(String(i + 1), inner.x + 12, ry + 13, { align: "center" });
        // Title
        pdf.setTextColor(20, 20, 20);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        const titleLines = pdf.splitTextToSize((b.title || "").toUpperCase(), textW);
        pdf.text(titleLines, inner.x + iconColW, ry + 11);
        // Body
        if (b.explanation) {
          pdf.setTextColor(80, 80, 80);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          const bodyLines = pdf.splitTextToSize(b.explanation, textW);
          pdf.text(bodyLines, inner.x + iconColW, ry + 11 + titleLines.length * 12 + 4);
        }
        ry += m.h + rowGap;
      }
      py += totalH + SECTION_GAP;
    }
  }

  /* ============== PAGE 3 — Branding Impact Infographics ============== */
  drawBrandingImpactPage({
    pdf, pageW, pageH, margin, contentW,
    rr, rg, rb, gr, gg, gb,
    abLogo: d.abLogoDataUrl ?? null,
    drawBg, sectionHeader, card,
    onBeforePage: () => {
      drawFooter();
      pdf.addPage();
      pageNum += 1;
    },
  });

  drawFooter();
  const safe = (d.businessName || "Brand").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Brand";
  pdf.save(`${safe}-Brand-Kit.pdf`);
}

/** Render the "Why Branding Works" infographic page (charts + percentages). */
function drawBrandingImpactPage(opts: {
  pdf: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  contentW: number;
  rr: number; rg: number; rb: number;
  gr: number; gg: number; gb: number;
  abLogo: { dataUrl: string; format: "PNG" | "JPEG" } | null;
  drawBg: () => void;
  sectionHeader: (n: string, title: string, x: number, yy: number, w: number) => void;
  card: (x: number, yy: number, w: number, h: number) => void;
  onBeforePage: () => void;
}) {
  const { pdf, pageW, pageH, margin, contentW, rr, rg, rb, abLogo, drawBg, sectionHeader, card, onBeforePage } = opts;

  onBeforePage();
  drawBg();

  // Header strip
  let y = margin;
  if (abLogo) {
    try {
      const props = pdf.getImageProperties(abLogo.dataUrl);
      const h = 36;
      const w = (props.width / props.height) * h;
      pdf.addImage(abLogo.dataUrl, abLogo.format, margin, y, w, h);
    } catch { /* skip */ }
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("ANAGLYPH BRANDING", margin + 46, y + 16, { charSpace: 1 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(200, 200, 200);
  pdf.text("The measurable impact of strong, consistent branding.", margin + 46, y + 30);
  y += 50;

  sectionHeader("9", "Why Branding Works — Proof in Numbers", margin, y, contentW);
  y += 30;

  // 2x2 grid of stat cards
  const gap = 14;
  const cardW = (contentW - gap) / 2;
  const cardH = 150;
  const stats = [
    {
      pct: "10–20%",
      title: "GROWTH FROM CONSISTENCY",
      body: "Consistent brand presentation is associated with a 10–20% increase in overall growth.",
      source: "Marq / Lucidpress brand consistency findings",
      kind: "bar" as const,
      barFill: 0.18,
    },
    {
      pct: "3–4×",
      title: "BRAND VISIBILITY",
      body: "Consistent brands are 3–4× more likely to receive visibility.",
      source: "Marq",
      kind: "compare" as const,
    },
    {
      pct: "81%",
      title: "PURCHASE TRUST",
      body: "81% of consumers take trust into account when making a purchase decision.",
      source: "Edelman",
      kind: "ring" as const,
      ringPct: 0.81,
    },
    {
      pct: "92%",
      title: "RECOMMENDATION TRUST",
      body: "92% of consumers trust recommendations from friends and family over other forms of advertising.",
      source: "Nielsen",
      kind: "ring" as const,
      ringPct: 0.92,
    },
  ];

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const cx = margin + (i % 2) * (cardW + gap);
    const cy = y + Math.floor(i / 2) * (cardH + gap);
    card(cx, cy, cardW, cardH);

    // Left: visual
    const visW = cardW * 0.42;
    const visX = cx + 14;
    const visY = cy + 18;
    const visH = cardH - 36;

    if (s.kind === "ring") {
      // Percentage ring (approximated with arcs via segments)
      const cxr = visX + visW / 2;
      const cyr = visY + visH / 2;
      const radius = Math.min(visW, visH) / 2 - 6;
      // Track
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(8);
      pdf.circle(cxr, cyr, radius, "S");
      // Progress (segmented polyline)
      pdf.setDrawColor(rr, rg, rb);
      pdf.setLineWidth(8);
      const seg = Math.max(8, Math.round(48 * (s.ringPct ?? 1)));
      const total = Math.round(48 * (s.ringPct ?? 1));
      const startA = -Math.PI / 2;
      let prev: [number, number] | null = null;
      for (let k = 0; k <= total; k++) {
        const a = startA + (k / 48) * Math.PI * 2;
        const px = cxr + Math.cos(a) * radius;
        const py = cyr + Math.sin(a) * radius;
        if (prev) pdf.line(prev[0], prev[1], px, py);
        prev = [px, py];
      }
      void seg;
      pdf.setTextColor(20, 20, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(s.pct, cxr, cyr + 6, { align: "center" });
    } else if (s.kind === "bar") {
      // Two horizontal bars: baseline vs branded
      const barH = 14;
      const baseY = visY + visH / 2 - barH - 6;
      const brandY = visY + visH / 2 + 6;
      pdf.setFillColor(230, 230, 230);
      pdf.rect(visX, baseY, visW, barH, "F");
      pdf.setFillColor(180, 180, 180);
      pdf.rect(visX, baseY, visW * 0.5, barH, "F");
      pdf.setFillColor(245, 215, 215);
      pdf.rect(visX, brandY, visW, barH, "F");
      pdf.setFillColor(rr, rg, rb);
      pdf.rect(visX, brandY, visW * (0.5 + (s.barFill ?? 0.18)), barH, "F");
      pdf.setTextColor(80, 80, 80);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text("BASELINE", visX, baseY - 3);
      pdf.setTextColor(rr, rg, rb);
      pdf.text("CONSISTENT BRAND", visX, brandY - 3);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(16);
      pdf.text(s.pct, visX + visW, brandY + barH + 14, { align: "right" });
    } else {
      // Compare 1x vs ~3.5x stacked blocks
      const blockW = 14;
      const baseH = 18;
      const brandH = baseH * 3.5;
      const baseX = visX + visW * 0.25 - blockW / 2;
      const brandX = visX + visW * 0.7 - blockW / 2;
      const floorY = visY + visH - 14;
      pdf.setFillColor(200, 200, 200);
      pdf.rect(baseX, floorY - baseH, blockW, baseH, "F");
      pdf.setFillColor(rr, rg, rb);
      pdf.rect(brandX, floorY - brandH, blockW, brandH, "F");
      pdf.setTextColor(80, 80, 80);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text("OTHERS", baseX + blockW / 2, floorY + 8, { align: "center" });
      pdf.setTextColor(rr, rg, rb);
      pdf.text("CONSISTENT", brandX + blockW / 2, floorY + 8, { align: "center" });
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(18);
      pdf.text(s.pct, brandX + blockW / 2, floorY - brandH - 6, { align: "center" });
    }

    // Right: text block
    const txX = cx + 14 + visW + 12;
    const txW = cardW - (txX - cx) - 14;
    pdf.setTextColor(rr, rg, rb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(s.title, txX, cy + 22, { charSpace: 0.6 });
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const bodyLines = pdf.splitTextToSize(s.body, txW);
    pdf.setLineHeightFactor(1.5);
    pdf.text(bodyLines, txX, cy + 38);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(6.5);
    pdf.text(`Source: ${s.source}`, txX, cy + cardH - 14);
  }

  // Takeaway strip
  const ty = y + 2 * (cardH + gap) + 4;
  pdf.setFillColor(rr, rg, rb);
  pdf.rect(margin, ty, contentW, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(
    "STRONG BRANDING IMPROVES RECOGNITION  ·  CONSISTENCY DRIVES VISIBILITY  ·  TRUST DRIVES BUYING DECISIONS",
    pageW / 2, ty + 18, { align: "center", charSpace: 0.6 },
  );
}
