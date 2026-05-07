import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Save, Database, RefreshCw, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles, loadBrandProfile, markPhaseComplete } from "@/api/phase2.functions";
import { saveBrandProfileDraft } from "@/api/profile.functions";
import { getMissingRequiredFields } from "@/lib/profile.shared";
import { PhaseChecklist, buildPhase1Checklist, derivePhase1Message, deriveBadge, deriveProjectStatus } from "@/components/brand-kit/PhaseChecklist";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-1")({
  head: () => ({ meta: [{ title: "Phase 1 — Complete Intake | AB Brand Kit" }] }),
  component: Phase1,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null; phase_1_completed_at?: string | null };

const TEXT_FIELDS: Array<{ key: string; label: string; long?: boolean; placeholder?: string }> = [
  { key: "business_name", label: "Business name", placeholder: "Big Dog Day Care" },
  { key: "industry", label: "Industry / business type", placeholder: "Dog daycare" },
  { key: "business_description", label: "Short business description", long: true, placeholder: "What does the business do, in 1–3 sentences." },
  { key: "business_stage", label: "Current business setup", long: true, placeholder: "e.g. brand new, 8 employees, one location, 6 events per year." },
  { key: "main_products_services", label: "Services / products offered", long: true, placeholder: "e.g. boarding, grooming, daycare, training." },
  { key: "target_customer", label: "Target customer", long: true, placeholder: "Who is this business for?" },
];

const ARRAY_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "brand_goals", label: "Business goals", placeholder: "grow membership, premium positioning, expand to second location" },
];

function Phase1() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const load = async (id: string) => {
    setSelectedId(id);
    if (!id) { setProfile({}); return; }
    const row = await loadBrandProfile({ data: { id } });
    setProfile((row as Record<string, unknown>) || {});
  };

  const setText = (k: string, v: string) => setProfile((p) => ({ ...p, [k]: v }));
  const setArr = (k: string, v: string) => setProfile((p) => ({ ...p, [k]: v.split(",").map((s) => s.trim()).filter(Boolean) }));
  const getStr = (k: string) => (profile[k] as string) ?? "";
  const getArr = (k: string) => ((profile[k] as string[] | null) ?? []).join(", ");

  const missing = getMissingRequiredFields(profile);
  const ready = missing.length === 0;

  const phase1Items = buildPhase1Checklist(profile);
  const phase1Msg = derivePhase1Message(phase1Items);
  const phase1Badge = deriveBadge({ approvalStatus: null, exportedAt: null, reviewLinkSent: false, phaseReady: ready });
  const projectStatus = deriveProjectStatus({
    phase1Done: ready,
    phase2ConceptsCount: 0,
    phase2Selected: false,
    phase3Ready: false,
    reviewLinkSent: false,
    approvalStatus: null,
    exportedAt: null,
  });

  const save = async (advance = false) => {
    setSaving(true);
    try {
      const result = await saveBrandProfileDraft({ data: { id: selectedId || undefined, patch: profile } });
      const newId = (result.profile as { id?: string } | null)?.id;
      if (newId && newId !== selectedId) setSelectedId(newId);
      toast.success("Intake saved");
      if (advance) {
        if (!ready) { toast.error(`Still missing: ${missing.join(", ")}`); return; }
        if (newId) await markPhaseComplete({ data: { id: newId, phase: 1 } });
        navigate({ to: "/phase-2" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const logoDirection = getStr("logo_direction");
  const setLogoDirection = (v: string) => setProfile((p) => ({ ...p, logo_direction: v }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={abLogo} alt="Anaglyph" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Phase 1 — Complete Intake</div>
              <div className="text-xs text-muted-foreground">Capture every detail before generating concepts.</div>
            </div>
          </div>
          <PhaseStepper current="/phase-1" completed={{ "/phase-1": ready }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Existing profile
            </h2>
            <Select value={selectedId} onValueChange={load}>
              <SelectTrigger><SelectValue placeholder={profiles.length ? "Pick a profile or start new" : "No saved profiles"} /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.business_name || "Untitled"} · {p.client_name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => { setSelectedId(""); setProfile({}); }}>+ New intake</Button>
          </section>

          <PhaseChecklist
            title="Phase 1 — Business Intake"
            items={phase1Items}
            message={phase1Msg}
            badge={phase1Badge}
            projectStatus={projectStatus}
          />

          <div className="space-y-2">
            <Button onClick={() => save(false)} disabled={saving} variant="outline" className="w-full">
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button onClick={() => save(true)} disabled={saving || !ready} className="w-full">
              {saving ? "Saving…" : "Continue to Phase 2"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            {!ready && <p className="text-[11px] text-muted-foreground">Complete the checklist to enable Phase 2.</p>}
          </div>
        </aside>

        <section className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-semibold tracking-tight">Business information</h2>
            <p className="mb-4 text-xs text-muted-foreground">Practical details we'll use to shape the logo and Brand Kit.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {TEXT_FIELDS.map((f) => (
                <div key={f.key} className={f.long ? "md:col-span-2" : ""}>
                  <Label>{f.label}</Label>
                  {f.long ? (
                    <Textarea className="mt-1.5" rows={3} placeholder={f.placeholder} value={getStr(f.key)} onChange={(e) => setText(f.key, e.target.value)} />
                  ) : (
                    <Input className="mt-1.5" placeholder={f.placeholder} value={getStr(f.key)} onChange={(e) => setText(f.key, e.target.value)} />
                  )}
                </div>
              ))}
              {ARRAY_FIELDS.map((f) => (
                <div key={f.key} className="md:col-span-2">
                  <Label>{f.label} <span className="text-muted-foreground">(comma-separated)</span></Label>
                  <Input className="mt-1.5" placeholder={f.placeholder} value={getArr(f.key)} onChange={(e) => setArr(f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-semibold tracking-tight">Logo direction</h2>
            <p className="mb-4 text-xs text-muted-foreground">Pick how Phase 2 should approach the logo.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "rework_existing", label: "Rework Existing Logo", desc: "Refine and modernize the current mark.", Icon: RefreshCw },
                { value: "design_new", label: "Design New Logo", desc: "Start fresh with brand-new concepts.", Icon: Sparkles },
              ].map(({ value, label, desc, Icon }) => {
                const active = logoDirection === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLogoDirection(value)}
                    className={cn(
                      "group relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-background hover:border-foreground/40 hover:bg-accent",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className="h-5 w-5 text-foreground" />
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link to="/phase-2" className="text-xs text-muted-foreground hover:text-foreground">Skip for now →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}