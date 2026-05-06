import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Save, Database, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PhaseStepper } from "@/components/PhaseStepper";
import { listBrandProfiles, loadBrandProfile, markPhaseComplete } from "@/api/phase2.functions";
import { saveBrandProfileDraft } from "@/api/profile.functions";
import { PHASE_2_REQUIRED_FIELDS, getMissingRequiredFields } from "@/lib/profile.shared";
import abLogo from "@/assets/ab-logo.png";

export const Route = createFileRoute("/phase-1")({
  head: () => ({ meta: [{ title: "Phase 1 — Complete Intake | AB Brand Kit" }] }),
  component: Phase1,
});

type ProfileRow = { id: string; business_name: string | null; client_name: string | null; phase_1_completed_at?: string | null };

const TEXT_FIELDS: Array<{ key: string; label: string; long?: boolean; section: string }> = [
  { key: "business_name", label: "Business name", section: "Basics" },
  { key: "client_name", label: "Client name", section: "Basics" },
  { key: "industry", label: "Industry", section: "Basics" },
  { key: "business_description", label: "Business description", long: true, section: "Basics" },
  { key: "target_customer", label: "Target customer", long: true, section: "Audience" },
  { key: "business_differentiator", label: "What makes them different", long: true, section: "Audience" },
  { key: "client_brand_vision", label: "Client brand vision", long: true, section: "Vision" },
  { key: "client_inspiration_notes", label: "Inspiration notes", long: true, section: "Vision" },
  { key: "tagline_ideas", label: "Tagline / slogan ideas", long: true, section: "Vision" },
];

const ARRAY_FIELDS: Array<{ key: string; label: string; section: string; placeholder: string }> = [
  { key: "brand_goals", label: "Brand goals", section: "Voice", placeholder: "growth, premium positioning, modern" },
  { key: "brand_personality", label: "Brand personality", section: "Voice", placeholder: "modern, bold, refined" },
  { key: "avoidance_checklist", label: "Avoidance list", section: "Voice", placeholder: "no neon, no clipart" },
  { key: "logo_type_preferences", label: "Logo type preferences", section: "Direction", placeholder: "monogram, wordmark" },
  { key: "color_mood", label: "Color direction", section: "Direction", placeholder: "warm, earthy, bold" },
  { key: "digital_usage", label: "Logo usage needs", section: "Direction", placeholder: "web, social, signage" },
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

  const sections = ["Basics", "Audience", "Voice", "Vision", "Direction"];

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

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Required checklist</h3>
            <ul className="mt-3 space-y-1.5 text-xs">
              {PHASE_2_REQUIRED_FIELDS.map((f) => {
                const done = !missing.includes(f.label);
                return (
                  <li key={f.key} className={`flex items-center gap-2 ${done ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500/15" : "border-border"}`}>
                      {done && <Check className="h-2.5 w-2.5" />}
                    </span>
                    {f.label}
                  </li>
                );
              })}
            </ul>
          </section>

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
          {sections.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold tracking-tight">{s}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {TEXT_FIELDS.filter((f) => f.section === s).map((f) => (
                  <div key={f.key} className={f.long ? "md:col-span-2" : ""}>
                    <Label>{f.label}</Label>
                    {f.long ? (
                      <Textarea className="mt-1.5" rows={3} value={getStr(f.key)} onChange={(e) => setText(f.key, e.target.value)} />
                    ) : (
                      <Input className="mt-1.5" value={getStr(f.key)} onChange={(e) => setText(f.key, e.target.value)} />
                    )}
                  </div>
                ))}
                {ARRAY_FIELDS.filter((f) => f.section === s).map((f) => (
                  <div key={f.key}>
                    <Label>{f.label} <span className="text-muted-foreground">(comma-separated)</span></Label>
                    <Input className="mt-1.5" placeholder={f.placeholder} value={getArr(f.key)} onChange={(e) => setArr(f.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-2">
            <Link to="/phase-2" className="text-xs text-muted-foreground hover:text-foreground">Skip for now →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}