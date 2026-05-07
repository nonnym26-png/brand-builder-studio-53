import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, Download, RefreshCw, Save, Sparkles, Wand2, MessageSquare, Type, Palette as PaletteIcon } from "lucide-react";
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
import { listBrandProfiles, loadBrandProfile, saveConcepts, generateAIDirections, generateSlogans, savePhase2Selections, markPhaseComplete } from "@/api/phase2.functions";
import { generatePremiumLogoImage } from "@/api/premiumLogoImage.functions";
import { toPng } from "html-to-image";
import abLogo from "@/assets/ab-logo.png";
import { DesignDnaEditor } from "@/components/DesignDnaEditor";
import { PhaseStepper } from "@/components/PhaseStepper";
import { PALETTES } from "@/components/brand-kit/palettes";
import { FONTS, type FontKey } from "@/components/brand-kit/types";
import { CustomFontUploader, useCustomFonts } from "@/components/brand-kit/CustomFontUploader";
import { DesignDnaRuleEditor, useDesignDna } from "@/components/brand-kit/DesignDnaRuleEditor";
import { AbCreativeEngine } from "@/components/brand-kit/AbCreativeEngine";

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

  // New Phase 2 creative selections
  const [fonts, setFonts] = useState<{ heading: FontKey; body: FontKey; accent: FontKey }>({ heading: "playfair", body: "inter", accent: "bebas" });
  const customFonts = useCustomFonts();
  const designDna = useDesignDna(profile.business_name || "default");
  const [slogans, setSlogans] = useState<string[]>([]);
  const [chosenSlogan, setChosenSlogan] = useState<string>("");
  const [sloganBusy, setSloganBusy] = useState(false);
  const ELEMENT_OPTIONS = ["Badge", "Ribbon", "Frame", "Monogram bracket", "Divider", "Dot accent", "Line", "Swoosh", "Crest", "Underline"];
  const [elements, setElements] = useState<string[]>([]);
  const [mascotEnabled, setMascotEnabled] = useState(false);
  const [mascotStyle, setMascotStyle] = useState<string>("geometric");
  const [mascotIdea, setMascotIdea] = useState("");

  // Premium AI image rendering
  const [premiumImage, setPremiumImage] = useState<string | null>(null);
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [premiumDescriptor, setPremiumDescriptor] = useState("CONSULTING");

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
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">AB Dynamic Logo Rendering Engine</div>
              <div className="text-xs text-muted-foreground">Phase 2 · Internal use</div>
            </div>
          </div>
          <PhaseStepper current="/phase-2" completed={{ "/phase-2": Boolean(selectedConceptId) }} />
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
          <DesignDnaEditor brandProfileId={selectedId || null} />

          {/* Creative selections */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Color scheme */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                <PaletteIcon className="h-4 w-4" /> Color Scheme
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setProfile({
                      ...profile,
                      primary_hex: p.colors[2],
                      secondary_hex: p.colors[3],
                      accent_hex: p.colors[2],
                      neutral_hex: p.colors[0],
                    })}
                    className="rounded-md border border-border p-2 text-left hover:border-foreground/40"
                  >
                    <div className="flex h-6 overflow-hidden rounded">
                      {p.colors.map((c) => <div key={c} className="flex-1" style={{ background: c }} />)}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Type className="h-4 w-4" /> Typography
              </h3>
              <div className="space-y-2">
                {(["heading", "body", "accent"] as const).map((slot) => (
                  <div key={slot}>
                    <Label className="text-xs uppercase text-muted-foreground">{slot}</Label>
                    <Select value={fonts[slot]} onValueChange={(v) => setFonts({ ...fonts, [slot]: v as FontKey })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FONTS) as FontKey[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            <span style={{ fontFamily: FONTS[k].family }}>{FONTS[k].label}</span>
                            <span className="ml-2 text-[10px] text-muted-foreground">{FONTS[k].category}</span>
                          </SelectItem>
                        ))}
                        {customFonts.fonts.length > 0 && (
                          <>
                            <div className="my-1 border-t border-border" />
                            <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">Your uploads</div>
                            {customFonts.fonts.map((f) => (
                              <SelectItem key={f.id} value={`custom:${f.family}` as unknown as FontKey}>
                                <span style={{ fontFamily: `"${f.family}", system-ui` }}>{f.label}</span>
                                <span className="ml-2 text-[10px] text-muted-foreground">Custom</span>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom font uploader */}
            <CustomFontUploader
              fonts={customFonts.fonts}
              onAdd={customFonts.add}
              onRemove={customFonts.remove}
              previewText={profile.business_name || "Aa Bb Cc 123"}
            />

            {/* Slogans */}
            <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <MessageSquare className="h-4 w-4" /> Slogan Generation
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sloganBusy}
                  onClick={async () => {
                    setSloganBusy(true);
                    try {
                      const out = await generateSlogans({ data: { profile: profile as unknown as Record<string, unknown>, count: 6 } });
                      setSlogans(out);
                      toast.success("Slogans generated");
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                    finally { setSloganBusy(false); }
                  }}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" /> {sloganBusy ? "Thinking…" : "Generate slogans"}
                </Button>
              </div>
              {slogans.length === 0 ? (
                <p className="text-xs text-muted-foreground">Click generate to get 6 AI-written tagline candidates from this brand profile.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {slogans.map((s) => (
                    <button
                      key={s}
                      onClick={() => setChosenSlogan(s)}
                      className={`rounded-md border px-3 py-2 text-left text-sm transition ${chosenSlogan === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Elements */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold tracking-tight">Brand Elements</h3>
              <div className="flex flex-wrap gap-1.5">
                {ELEMENT_OPTIONS.map((el) => {
                  const on = elements.includes(el);
                  return (
                    <button
                      key={el}
                      onClick={() => setElements(on ? elements.filter((x) => x !== el) : [...elements, el])}
                      className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"}`}
                    >
                      {el}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mascot */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">Mascot</h3>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={mascotEnabled} onChange={(e) => setMascotEnabled(e.target.checked)} />
                  Include mascot
                </label>
              </div>
              {mascotEnabled && (
                <div className="space-y-2">
                  <Select value={mascotStyle} onValueChange={setMascotStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["geometric", "line-art", "mythological", "animal", "abstract figure", "vintage"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Mascot idea (e.g. crowned lion, paper crane…)" value={mascotIdea} onChange={(e) => setMascotIdea(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Save selections + advance */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedId}
              onClick={async () => {
                if (!selectedId) { toast.error("Pick a profile first"); return; }
                await savePhase2Selections({ data: {
                  id: selectedId,
                  palette: { primary: profile.primary_hex || "", secondary: profile.secondary_hex || "", accent: profile.accent_hex || "", neutral: profile.neutral_hex || "" },
                  fonts,
                  slogans,
                  chosenSlogan: chosenSlogan || null,
                  elements,
                  mascot: { enabled: mascotEnabled, style: mascotStyle, idea: mascotIdea },
                } });
                toast.success("Selections saved");
              }}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save selections
            </Button>
            <Button
              size="sm"
              disabled={!selectedId || !selectedConceptId}
              onClick={async () => {
                if (!selectedId) return;
                const selected = concepts.find((c) => c.id === selectedConceptId) ?? null;
                await saveConcepts({ data: { id: selectedId, concepts, selected, notes } });
                await markPhaseComplete({ data: { id: selectedId, phase: 2 } });
                window.location.href = "/phase-3";
              }}
            >
              Continue to Phase 3 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

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

          {/* Premium AI Logo Render — refines the SELECTED dynamic concept */}
          {(() => {
            const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || null;
            return (
              <>
              <AbCreativeEngine brandProfileId={selectedId || null} />
              <DesignDnaRuleEditor
                dna={designDna.dna}
                onChange={designDna.update}
                onReset={designDna.reset}
                brandName={profile.business_name || undefined}
              />
              <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                      <Sparkles className="h-4 w-4 text-primary" /> Premium Logo Render
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConcept
                        ? <>Refining selected concept <strong>{selectedConcept.name}</strong> into an agency-grade lockup.</>
                        : <>Select a concept above first — the premium render will improve and refine the design DNA of the chosen concept.</>}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_320px]">
                  <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-4">
                    {premiumImage ? (
                      <img src={premiumImage} alt="Premium logo render" className="max-h-[480px] w-auto object-contain" />
                    ) : (
                      <div className="text-center text-xs text-muted-foreground">
                        <Sparkles className="mx-auto mb-2 h-6 w-6 opacity-40" />
                        {selectedConcept
                          ? <>Click <strong>Refine Selected Concept</strong> to render a premium version.</>
                          : <>No concept selected.</>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs uppercase text-muted-foreground">Descriptor</Label>
                      <Input className="mt-1" value={premiumDescriptor} onChange={(e) => setPremiumDescriptor(e.target.value)} placeholder="CONSULTING, STUDIO, GROUP…" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Brand: <strong>{profile.business_name}</strong><br />
                      Initial: <strong>{(profile.initials_abbreviation || profile.business_name || "A").charAt(0).toUpperCase()}</strong><br />
                      {selectedConcept && (
                        <>Concept: <strong>{selectedConcept.name}</strong> ({selectedConcept.markType})<br /></>
                      )}
                      Colors: <span style={{ color: profile.primary_hex || undefined }}>{profile.primary_hex || "#0F0F10"}</span> · <span style={{ color: profile.accent_hex || undefined }}>{profile.accent_hex || "#B81F2A"}</span>
                    </div>
                    <Button
                      className="w-full"
                      disabled={premiumBusy || !selectedConcept}
                      onClick={async () => {
                        if (!selectedConcept) { toast.error("Select a concept first"); return; }
                        setPremiumBusy(true);
                        setPremiumImage(null);
                        try {
                          const c = selectedConcept;
                          const direction = [
                            `Refine and improve this dynamic concept while preserving its design DNA.`,
                            `Concept: "${c.name}" — ${c.markType}.`,
                            c.tagline ? `Idea: ${c.tagline}.` : "",
                            `Mood: ${c.moodWords.join(", ")}.`,
                            `Geometry: ${c.geometry}; corners: ${c.cornerStyle}; strokes: ${c.strokeStyle}.`,
                            `Layout: ${c.layout}.`,
                            c.symbol && c.symbol !== "none" ? `Symbol cue: ${c.symbol}.` : "",
                            `Heading typeface direction: ${c.headingFont}; descriptor: ${c.subFont}.`,
                            `Palette — primary ${c.palette.primary}, accent ${c.palette.accent}, dark ${c.palette.dark}.`,
                            chosenSlogan ? `Tagline tone: "${chosenSlogan}".` : "",
                            `Make it more refined: improve spacing, typographic kerning, optical balance, line quality, and silhouette strength. Do NOT redesign — elevate.`,
                          ].filter(Boolean).join(" ");
                          const out = await generatePremiumLogoImage({ data: {
                            brandName: profile.business_name || "Brand",
                            initial: (profile.initials_abbreviation || profile.business_name || "A").charAt(0),
                            descriptor: premiumDescriptor,
                            primaryHex: c.palette.dark || profile.neutral_hex || "#0F0F10",
                            accentHex: c.palette.accent || profile.accent_hex || "#B81F2A",
                            neutralHex: c.palette.primary || profile.neutral_hex || "#3A3A3A",
                            markType: c.markType as any,
                            extraDirection: direction,
                            designDna: designDna.dna,
                          } });
                          setPremiumImage(out.imageUrl);
                          toast.success("Premium refinement rendered");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Render failed");
                        } finally {
                          setPremiumBusy(false);
                        }
                      }}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {premiumBusy ? "Refining… (30-60s)" : selectedConcept ? "Refine Selected Concept" : "Select a concept first"}
                    </Button>
                    {premiumImage && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = premiumImage;
                          a.download = `${(profile.business_name || "logo").toLowerCase().replace(/\s+/g, "-")}-premium.png`;
                          a.click();
                        }}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PNG
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              </>
            );
          })()}
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