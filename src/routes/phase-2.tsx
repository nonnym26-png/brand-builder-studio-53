import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, Loader2, RefreshCw, Save, Sparkles, Wand2, MessageSquare, Type, Palette as PaletteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generateConcepts } from "@/components/brand-kit/conceptEngine";
import type { LogoConcept, ProfileLite } from "@/components/brand-kit/conceptTypes";
import { listBrandProfiles, loadBrandProfile, saveConcepts, generateSlogans, savePhase2Selections, markPhaseComplete } from "@/api/phase2.functions";
import abLogo from "@/assets/ab-logo.png";
import { DesignDnaEditor } from "@/components/DesignDnaEditor";
import { PhaseStepper } from "@/components/PhaseStepper";
import { PALETTES } from "@/components/brand-kit/palettes";
import { FONTS, type FontKey } from "@/components/brand-kit/types";
import { CustomFontUploader, useCustomFonts } from "@/components/brand-kit/CustomFontUploader";
import { DesignDnaRuleEditor, useDesignDna } from "@/components/brand-kit/DesignDnaRuleEditor";
import { AbCreativeEngine, type AbCreativeEngineHandle } from "@/components/brand-kit/AbCreativeEngine";

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
  const [renderBackground, setRenderBackground] = useState<"white" | "transparent" | "dark" | "mockup-free">("white");
  const [generating, setGenerating] = useState(false);
  const engineRef = useRef<AbCreativeEngineHandle | null>(null);

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
            <p className="text-[11px] text-muted-foreground -mt-1">
              Live overrides for this generation. The Phase 1 profile loaded above is the source of truth — anything you change here is fed straight into the AI prompt without saving to the profile.
            </p>
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
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="color" value={profile.primary_hex || "#000000"} onChange={(e) => setProfile({ ...profile, primary_hex: e.target.value })} className="h-9 w-9 rounded border border-border bg-transparent cursor-pointer shrink-0" aria-label="Primary color picker" />
                  <Input value={profile.primary_hex || ""} onChange={(e) => setProfile({ ...profile, primary_hex: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Secondary</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="color" value={profile.secondary_hex || "#000000"} onChange={(e) => setProfile({ ...profile, secondary_hex: e.target.value })} className="h-9 w-9 rounded border border-border bg-transparent cursor-pointer shrink-0" aria-label="Secondary color picker" />
                  <Input value={profile.secondary_hex || ""} onChange={(e) => setProfile({ ...profile, secondary_hex: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Accent</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="color" value={profile.accent_hex || "#000000"} onChange={(e) => setProfile({ ...profile, accent_hex: e.target.value })} className="h-9 w-9 rounded border border-border bg-transparent cursor-pointer shrink-0" aria-label="Accent color picker" />
                  <Input value={profile.accent_hex || ""} onChange={(e) => setProfile({ ...profile, accent_hex: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Dark/neutral</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="color" value={profile.neutral_hex || "#000000"} onChange={(e) => setProfile({ ...profile, neutral_hex: e.target.value })} className="h-9 w-9 rounded border border-border bg-transparent cursor-pointer shrink-0" aria-label="Neutral color picker" />
                  <Input value={profile.neutral_hex || ""} onChange={(e) => setProfile({ ...profile, neutral_hex: e.target.value })} />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Hex colors are passed to the renderer with explicit instructions to honor them. Use the swatch to pick or paste a hex.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={regenerate} variant="outline"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate</Button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Internal notes</h2>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Designer-only notes for AB. Saved to the brand profile alongside any selected concept. Not sent to AI.
            </p>
            <Textarea rows={4} placeholder="AB creative direction notes for this round…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" onClick={saveBack} disabled={!selectedId || !!savingId} className="w-full">
              <Save className="mr-1.5 h-3.5 w-3.5" /> {savingId ? "Saving…" : "Save concepts to profile"}
            </Button>
          </section>
        </aside>

        {/* Right: concept gallery */}
        <section className="space-y-6">
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-xs text-foreground/80 leading-relaxed">
            <div className="font-semibold text-sm mb-1">How Phase 2 works</div>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li><strong>Design DNA Brief</strong> — locked agency-grade rules pulled from intake (auto-generated).</li>
              <li><strong>Color Scheme, Typography, Slogan, Brand Elements, Mascot</strong> — designer choices that customize this round.</li>
              <li><strong>Design DNA Rules</strong> — your hard constraints (must-have / avoid / quality bar / formula) injected into every render.</li>
              <li><strong>AB Creative Engine</strong> — sends all of the above to AI in two stages (brief → prompt → image), saves results, supports revisions.</li>
            </ol>
          </div>

          <DesignDnaEditor brandProfileId={selectedId || null} />

          {/* Creative selections */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Color scheme */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                <PaletteIcon className="h-4 w-4" /> Color Scheme
              </h3>
              <p className="text-[11px] text-muted-foreground mb-2">Pick a curated preset to populate Primary / Secondary / Accent / Neutral hex codes used by the renderer.</p>
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
              <p className="text-[11px] text-muted-foreground mb-2">Choose heading / body / accent typefaces. The names are sent to the AI as the typography direction.</p>
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
              <p className="text-[11px] text-muted-foreground mb-2">AI writes 6 tagline candidates from this brand profile. The selected one becomes the lockup tagline in the render.</p>
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
              <p className="text-[11px] text-muted-foreground mb-2">Optional structural cues (badge, ribbon, frame…) the AI should consider in the composition.</p>
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
              <p className="text-[11px] text-muted-foreground mb-2">Toggle on to instruct the AI to build a character-led mark with the chosen style and idea.</p>
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
              disabled={!selectedId}
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

          <DesignDnaRuleEditor
            dna={designDna.dna}
            onChange={designDna.update}
            onReset={designDna.reset}
            brandName={profile.business_name || undefined}
          />

          {/* Generate Logo Design — primary CTA */}
          <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" /> Generate Logo Design
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Bundles <strong>everything above</strong> — Phase 1 intake, palette, typography, slogan, brand elements, mascot, and Design DNA Rules — and renders a logo with the AB Creative Engine. Result appears in the gallery below.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Background</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={renderBackground}
                  onChange={(e) => setRenderBackground(e.target.value as typeof renderBackground)}
                >
                  <option value="white">White</option>
                  <option value="transparent">Transparent</option>
                  <option value="dark">Dark</option>
                  <option value="mockup-free">Mockup-free</option>
                </select>
              </div>
            </div>

            {/* Summary chips */}
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full border border-border bg-background px-2 py-0.5">{profile.business_name || "Untitled"}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5">
                Palette
                {[profile.primary_hex, profile.secondary_hex, profile.accent_hex, profile.neutral_hex].filter(Boolean).map((c) => (
                  <span key={c as string} className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: c as string }} />
                ))}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                Type: {FONTS[fonts.heading]?.label} / {FONTS[fonts.body]?.label}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                Slogan: {chosenSlogan ? "✓" : "—"}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                Elements: {elements.length}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                Mascot: {mascotEnabled ? mascotStyle : "off"}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                DNA: {(designDna.dna.mustHave ? "must " : "") + (designDna.dna.avoid ? "· avoid " : "") + (designDna.dna.qualityBar ? "· quality " : "") + (designDna.dna.formula ? "· formula" : "") || "defaults"}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                {selectedId ? "Ready to render. The full creative brief will be visible on the result card." : "Pick a Phase 1 profile in the sidebar to enable generation."}
              </p>
              <Button
                size="lg"
                disabled={!selectedId || generating}
                onClick={async () => {
                  if (!engineRef.current) return;
                  setGenerating(true);
                  try {
                    await engineRef.current.generate(renderBackground);
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Logo Design
              </Button>
            </div>
          </section>

          <AbCreativeEngine
            ref={engineRef}
            brandProfileId={selectedId || null}
            hideHeaderGenerate
            designDna={designDna.dna}
            extras={{
              fonts,
              chosenSlogan: chosenSlogan || null,
              elements,
              mascot: { enabled: mascotEnabled, style: mascotStyle, idea: mascotIdea },
            }}
          />
        </section>
      </main>
    </div>
  );
}
