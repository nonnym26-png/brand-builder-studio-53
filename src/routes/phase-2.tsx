import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Database, Download, RefreshCw, Save, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ConceptMark } from "@/components/brand-kit/ConceptRenderer";
import { generateConcepts, mergeAIDirections } from "@/components/brand-kit/conceptEngine";
import type { LogoConcept, ProfileLite } from "@/components/brand-kit/conceptTypes";
import { exportConceptPDF } from "@/components/brand-kit/exportConceptPdf";
import { listBrandProfiles, loadBrandProfile, saveConcepts, generateAIDirections } from "@/server/phase2.functions";
import { toPng } from "html-to-image";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-2")({ component: Phase2 });

type ProfileRow = { id: string; business_name: string | null; client_name: string | null; industry: string | null; project_status: string | null; updated_at: string | null };

function Phase2() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profile, setProfile] = useState<ProfileLite>({
    business_name: "Aurelia Co.",
    industry: "Boutique consulting",
    business_differentiator: "Quietly modern, deeply considered.",
    brand_personality: ["modern", "premium"],
    brand_feeling: "calm, confident",
    primary_hex: "#D6262C",
    secondary_hex: "#2BA8E0",
    accent_hex: "#2BA8E0",
    neutral_hex: "#0F0F10",
    initials_abbreviation: "AU",
  });
  const [concepts, setConcepts] = useState<LogoConcept[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Initial deterministic generation
  useEffect(() => {
    setConcepts(generateConcepts(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const loadProfile = async (id: string) => {
    setSelectedId(id);
    try {
      const row = (await loadBrandProfile({ data: { id } })) as ProfileLite | null;
      if (row) {
        setProfile(row);
        setConcepts(generateConcepts(row));
        setSelectedConceptId(null);
        toast.success("Profile loaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  const regenerate = () => {
    setConcepts(generateConcepts(profile));
    setSelectedConceptId(null);
  };

  const aiEnhance = async () => {
    setAiBusy(true);
    try {
      const base = generateConcepts(profile);
      const directions = await generateAIDirections({
        data: {
          profile: profile as unknown as Record<string, unknown>,
          baseConcepts: base.map((c) => ({ id: c.id, name: c.name, markType: c.markType, moodWords: c.moodWords })),
        },
      });
      setConcepts(mergeAIDirections(base, directions));
      toast.success("AI directions generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiBusy(false);
    }
  };

  const saveBack = async () => {
    if (!selectedId) { toast.error("Pick a saved profile first"); return; }
    setSavingId(selectedId);
    try {
      const selected = concepts.find((c) => c.id === selectedConceptId) ?? null;
      await saveConcepts({ data: { id: selectedId, concepts, selected, notes } });
      toast.success("Saved to brand profile");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">AB Dynamic Logo Rendering Engine</div>
              <div className="text-xs text-muted-foreground">Phase 2 · Internal use</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to builder
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-6 px-6 py-8 lg:grid-cols-[360px_1fr]">
        {/* Left: profile loader + override */}
        <aside className="space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Phase 1 Profile
            </h2>
            <Select value={selectedId} onValueChange={loadProfile}>
              <SelectTrigger><SelectValue placeholder={profiles.length ? "Pick a saved profile" : "No saved profiles yet"} /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span className="text-sm">{p.business_name || "Untitled"} <span className="text-muted-foreground">· {p.client_name || "—"}</span></span>
                      <span className="text-[10px] text-muted-foreground">{p.industry || "—"} · {p.project_status || "—"}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Override fields</h2>
            <div>
              <Label>Business name</Label>
              <Input className="mt-1.5" value={profile.business_name || ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} />
            </div>
            <div>
              <Label>Initials</Label>
              <Input className="mt-1.5" maxLength={3} value={profile.initials_abbreviation || ""} onChange={(e) => setProfile({ ...profile, initials_abbreviation: e.target.value })} />
            </div>
            <div>
              <Label>Industry</Label>
              <Input className="mt-1.5" value={profile.industry || ""} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} />
            </div>
            <div>
              <Label>Differentiator</Label>
              <Textarea className="mt-1.5" rows={2} value={profile.business_differentiator || ""} onChange={(e) => setProfile({ ...profile, business_differentiator: e.target.value })} />
            </div>
            <div>
              <Label>Brand personality (comma-separated)</Label>
              <Input className="mt-1.5" value={(profile.brand_personality || []).join(", ")} onChange={(e) => setProfile({ ...profile, brand_personality: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Primary</Label>
                <Input className="mt-1.5" value={profile.primary_hex || ""} onChange={(e) => setProfile({ ...profile, primary_hex: e.target.value })} />
              </div>
              <div>
                <Label>Secondary</Label>
                <Input className="mt-1.5" value={profile.secondary_hex || ""} onChange={(e) => setProfile({ ...profile, secondary_hex: e.target.value })} />
              </div>
              <div>
                <Label>Accent</Label>
                <Input className="mt-1.5" value={profile.accent_hex || ""} onChange={(e) => setProfile({ ...profile, accent_hex: e.target.value })} />
              </div>
              <div>
                <Label>Dark/neutral</Label>
                <Input className="mt-1.5" value={profile.neutral_hex || ""} onChange={(e) => setProfile({ ...profile, neutral_hex: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={regenerate} variant="outline"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate</Button>
              <Button size="sm" onClick={aiEnhance} disabled={aiBusy}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> {aiBusy ? "Thinking…" : "AI strategy"}
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Internal notes</h2>
            <Textarea rows={4} placeholder="AB creative direction notes for this round…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" onClick={saveBack} disabled={!selectedId || !!savingId} className="w-full">
              <Save className="mr-1.5 h-3.5 w-3.5" /> {savingId ? "Saving…" : "Save concepts to profile"}
            </Button>
          </section>
        </aside>

        {/* Right: concept gallery */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Logo Concept Directions
              </h1>
              <p className="text-sm text-muted-foreground">{concepts.length} dynamic concepts generated from this brand profile.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {concepts.map((c) => (
              <ConceptCard
                key={c.id}
                concept={c}
                selected={selectedConceptId === c.id}
                onSelect={() => setSelectedConceptId(c.id)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ConceptCard({ concept, selected, onSelect }: { concept: LogoConcept; selected: boolean; onSelect: () => void }) {
  const refs = {
    light: useRef<HTMLDivElement>(null),
    dark: useRef<HTMLDivElement>(null),
    brand: useRef<HTMLDivElement>(null),
    mono: useRef<HTMLDivElement>(null),
    mark: useRef<HTMLDivElement>(null),
  };
  const [exporting, setExporting] = useState(false);

  const downloadPDF = async () => {
    setExporting(true);
    try {
      const opts = { pixelRatio: 2, cacheBust: true };
      const [light, dark, brand, mono, mark] = await Promise.all([
        toPng(refs.light.current!, opts),
        toPng(refs.dark.current!, opts),
        toPng(refs.brand.current!, opts),
        toPng(refs.mono.current!, opts),
        toPng(refs.mark.current!, opts),
      ]);
      await exportConceptPDF(concept, { light, dark, brand, mono, mark });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const downloadSVG = (mode: "light" | "dark" | "brand") => {
    const node = refs[mode].current?.querySelector("svg");
    if (!node) { toast.error("No SVG to export for this layout"); return; }
    const xml = new XMLSerializer().serializeToString(node);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${concept.brandName.toLowerCase().replace(/\s+/g, "-")}-${concept.id}-${mode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-xl border bg-card transition ${selected ? "border-foreground ring-2 ring-foreground/10" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">#{concept.id}</span>
            <Badge variant="outline" className="text-[10px] uppercase">{concept.markType}</Badge>
            {concept.moodWords.slice(0, 2).map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] uppercase">{m}</Badge>
            ))}
          </div>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{concept.name}</h3>
          {concept.tagline && <p className="text-xs text-muted-foreground">{concept.tagline}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant={selected ? "default" : "outline"} onClick={onSelect}>
            {selected ? "Selected" : "Select"}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF} disabled={exporting}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> {exporting ? "…" : "PDF"}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div ref={refs.light} className="overflow-hidden rounded-lg">
          <ConceptMark concept={concept} mode="light" size={420} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div ref={refs.dark} className="overflow-hidden rounded-md"><ConceptMark concept={concept} mode="dark" size={180} /></div>
          <div ref={refs.brand} className="overflow-hidden rounded-md"><ConceptMark concept={concept} mode="brand" size={180} /></div>
          <div ref={refs.mono} className="overflow-hidden rounded-md"><ConceptMark concept={concept} mode="mono" size={180} /></div>
        </div>
        <div ref={refs.mark} className="hidden">
          <ConceptMark concept={concept} mode="light" size={300} showName={false} />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{concept.rationale}</p>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(["light", "dark", "brand"] as const).map((m) => (
            <button
              key={m}
              onClick={() => downloadSVG(m)}
              className="rounded-md border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              SVG · {m}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground">
            {concept.palette.primary.toUpperCase()} · {concept.palette.dark.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}