import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, Loader2, Sparkles, Wand2, MessageSquare, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ProfileLite } from "@/components/brand-kit/conceptTypes";
import { listBrandProfiles, loadBrandProfile, generateSlogans, savePhase2Selections, markPhaseComplete } from "@/api/phase2.functions";
import { uploadExistingLogo } from "@/api/profile.functions";
import abLogo from "@/assets/ab-logo.png";
import { PhaseStepper } from "@/components/PhaseStepper";
import { AbCreativeEngine, type AbCreativeEngineHandle } from "@/components/brand-kit/AbCreativeEngine";
import { PhaseChecklist, buildPhase2Checklist, derivePhase2Message, deriveBadge, deriveProjectStatus } from "@/components/brand-kit/PhaseChecklist";
import { listAbDesigns } from "@/api/abCreativeEngine.functions";

export const Route = createFileRoute("/phase-2")({ component: Phase2 });

type ProfileRow = { id: string; business_name: string | null; client_name: string | null; industry: string | null; project_status: string | null; updated_at: string | null };

function Phase2() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profile, setProfile] = useState<ProfileLite>({});
  const [profileFull, setProfileFull] = useState<Record<string, unknown> | null>(null);
  const [phase2Designs, setPhase2Designs] = useState<Array<{ id: string; design_type: string | null; quality_score: number | null; is_approved: boolean }>>([]);

  const [slogans, setSlogans] = useState<string[]>([]);
  const [chosenSlogan, setChosenSlogan] = useState<string>("");
  const [sloganBusy, setSloganBusy] = useState(false);

  const [renderBackground, setRenderBackground] = useState<"white" | "transparent" | "dark" | "mockup-free">("white");
  const [outputCount, setOutputCount] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const engineRef = useRef<AbCreativeEngineHandle | null>(null);

  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => { listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {}); }, []);

  const loadProfile = async (id: string) => {
    setSelectedId(id);
    try {
      const row = (await loadBrandProfile({ data: { id } })) as Record<string, unknown> | null;
      if (row) {
        setProfile(row as ProfileLite);
        setProfileFull(row);
        setExistingLogoUrl((row.existing_logo_url as string | null) ?? null);
        setChosenSlogan((row.tagline_ideas as string | null) ?? "");
        setSlogans(((row.phase_2_slogans as string[] | null) ?? []) || []);
        toast.success("Profile loaded");
      }
      const { designs } = await listAbDesigns({ data: { brandProfileId: id } });
      setPhase2Designs((designs as Array<Record<string, unknown>>).map((d) => ({
        id: String(d.id),
        design_type: (d.design_type as string | null) ?? null,
        quality_score: (d.quality_score as number | null) ?? null,
        is_approved: Boolean(d.is_approved),
      })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  const logoDirection = (profileFull?.logo_direction as string | null) ?? null;
  const isRework = logoDirection === "rework_existing";
  const businessName = (profileFull?.business_name as string | null) ?? "this project";

  const phase2Items = buildPhase2Checklist({ profile: profileFull, designs: phase2Designs });
  const phase2Msg = derivePhase2Message(phase2Items);
  const phase2Ready = phase2Designs.some((d) => d.is_approved);
  const phase2Badge = deriveBadge({
    approvalStatus: null,
    exportedAt: (profileFull?.brand_kit_exported_at as string | null) ?? null,
    reviewLinkSent: false,
    phaseReady: phase2Ready,
  });
  const projectStatus = deriveProjectStatus({
    phase1Done: Boolean(profileFull?.phase_1_completed_at),
    phase2ConceptsCount: phase2Designs.length,
    phase2Selected: phase2Designs.some((d) => d.is_approved),
    phase3Ready: phase2Ready,
    reviewLinkSent: false,
    approvalStatus: null,
    exportedAt: (profileFull?.brand_kit_exported_at as string | null) ?? null,
  });

  const handleUpload = async (file: File) => {
    if (!selectedId) { toast.error("Pick a Phase 1 profile first"); return; }
    setUploadBusy(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const { url } = await uploadExistingLogo({ data: { brandProfileId: selectedId, dataUrl, filename: file.name } });
      setExistingLogoUrl(url);
      setProfileFull((p) => ({ ...(p || {}), existing_logo_url: url }));
      toast.success("Existing logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  const continueToPhase3 = async () => {
    if (!selectedId) return;
    if (!phase2Designs.some((d) => d.is_approved)) {
      toast.error("Approve at least one logo first");
      return;
    }
    try {
      // Persist any slogan/typography style notes captured in Phase 2.
      await savePhase2Selections({ data: {
        id: selectedId,
        slogans,
        chosenSlogan: chosenSlogan || null,
      } });
      await markPhaseComplete({ data: { id: selectedId, phase: 2 } });
      window.location.href = "/phase-3";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Phase 2 — AI Logo Builder</div>
              <div className="text-xs text-muted-foreground">Generate, revise, and approve the official logo.</div>
            </div>
          </div>
          <PhaseStepper current="/phase-2" completed={{ "/phase-2": phase2Ready }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[340px_1fr]">
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
                      <span className="text-sm">{p.business_name || "Untitled"}</span>
                      <span className="text-[10px] text-muted-foreground">{p.industry || "—"} · {p.project_status || "—"}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {selectedId && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Logo direction</div>
              <div className="text-sm font-semibold">
                {logoDirection === "rework_existing" ? "Rework Existing Logo" : logoDirection === "design_new" ? "Design New Logo" : "Not set in Phase 1"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">For {businessName}</div>
            </div>
          )}

          {selectedId && (
            <PhaseChecklist
              title="Phase 2 — Logo"
              items={phase2Items}
              message={phase2Msg}
              badge={phase2Badge}
              projectStatus={projectStatus}
            />
          )}

          <Button onClick={continueToPhase3} disabled={!selectedId || !phase2Ready} className="w-full">
            Continue to Phase 3 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          {!phase2Ready && selectedId && (
            <p className="text-[11px] text-muted-foreground -mt-2">Approve at least one logo to continue.</p>
          )}
        </aside>

        <section className="space-y-6">
          {!selectedId && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Pick a Phase 1 profile in the sidebar to start generating logo concepts.
            </div>
          )}

          {selectedId && isRework && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                <ImageIcon className="h-4 w-4" /> Existing Logo
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Upload the current logo. The AI will use it as the reference when generating reworked / improved concepts.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-md border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                  {existingLogoUrl ? (
                    <img src={existingLogoUrl} alt="Existing logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                    />
                    <Button asChild size="sm" disabled={uploadBusy}>
                      <span>{uploadBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {existingLogoUrl ? "Replace logo" : "Upload existing logo"}</span>
                    </Button>
                  </label>
                  {existingLogoUrl && <p className="text-[11px] text-muted-foreground break-all max-w-md">{existingLogoUrl}</p>}
                </div>
              </div>
            </div>
          )}

          {selectedId && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <MessageSquare className="h-4 w-4" /> Slogan (optional)
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
              <p className="text-[11px] text-muted-foreground mb-2">If you want a tagline locked up with the logo, generate options and pick one.</p>
              {slogans.length === 0 ? (
                <p className="text-xs text-muted-foreground">No slogans yet.</p>
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
          )}

          {selectedId && (
            <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" /> Generate Logo Design
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    {isRework
                      ? "Generates reworked concepts based on the existing logo and the Phase 1 brief."
                      : "Generates fresh logo concepts from the Phase 1 business intake."}
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
                  <Label className="text-xs text-muted-foreground ml-2">Concepts</Label>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    value={outputCount}
                    onChange={(e) => setOutputCount(Number(e.target.value))}
                  >
                    {[1,2,3,4].map((n) => <option key={n} value={n}>{n} concept{n>1?"s":""}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <Button
                  size="lg"
                  disabled={generating}
                  onClick={async () => {
                    if (!engineRef.current) return;
                    setGenerating(true);
                    try { await engineRef.current.generate(renderBackground, outputCount); }
                    finally { setGenerating(false); }
                  }}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {outputCount > 1 ? `Generate ${outputCount} Concepts` : "Generate Logo Design"}
                </Button>
              </div>
            </section>
          )}

          {selectedId && (
            <AbCreativeEngine
              ref={engineRef}
              brandProfileId={selectedId}
              hideHeaderGenerate
              extras={{
                chosenSlogan: chosenSlogan || null,
              }}
              onDesignsChanged={(list) => setPhase2Designs(list)}
            />
          )}
        </section>
      </main>
    </div>
  );
}
