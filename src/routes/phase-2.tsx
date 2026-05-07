import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Database, Loader2, Upload, ImageIcon, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listBrandProfiles, loadBrandProfile, markPhaseComplete } from "@/api/phase2.functions";
import { uploadPhase2Logo, removePhase2Logo } from "@/api/profile.functions";
import abLogo from "@/assets/ab-logo.png";
import { PhaseStepper } from "@/components/PhaseStepper";

export const Route = createFileRoute("/phase-2")({ component: Phase2 });

type ProfileRow = {
  id: string;
  business_name: string | null;
  client_name: string | null;
  industry: string | null;
  project_status: string | null;
  updated_at: string | null;
};

type LogoSlot = {
  key: string;
  label: string;
  description: string;
};

const LOGO_SLOTS: LogoSlot[] = [
  { key: "main", label: "Main Logo", description: "Primary full-color brand logo." },
  { key: "abbreviated", label: "Abbreviated Logo", description: "Short version (initials, monogram, or condensed lockup)." },
  { key: "icon", label: "Icon Logo", description: "Icon / symbol only — for avatars and favicons." },
  { key: "black", label: "Black Logo", description: "Solid black version for light backgrounds." },
  { key: "white", label: "White Logo", description: "Solid white version for dark backgrounds." },
  { key: "additional", label: "Additional Logo", description: "Optional extra variation." },
];

function Phase2() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profileFull, setProfileFull] = useState<Record<string, unknown> | null>(null);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);

  useEffect(() => {
    listBrandProfiles().then((rows) => setProfiles(rows as ProfileRow[])).catch(() => {});
  }, []);

  const loadProfile = async (id: string) => {
    setSelectedId(id);
    try {
      const row = (await loadBrandProfile({ data: { id } })) as Record<string, unknown> | null;
      if (row) {
        setProfileFull(row);
        setLogos(((row.phase_2_uploaded_logos as Record<string, string> | null) || {}));
        toast.success("Profile loaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  const handleUpload = async (slot: string, file: File) => {
    if (!selectedId) {
      toast.error("Pick a Phase 1 profile first");
      return;
    }
    setBusySlot(slot);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const out = await uploadPhase2Logo({
        data: { brandProfileId: selectedId, slot, dataUrl, filename: file.name },
      });
      setLogos(out.logos);
      toast.success(`${LOGO_SLOTS.find((s) => s.key === slot)?.label} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusySlot(null);
    }
  };

  const handleRemove = async (slot: string) => {
    if (!selectedId) return;
    setBusySlot(slot);
    try {
      const out = await removePhase2Logo({ data: { brandProfileId: selectedId, slot } });
      setLogos(out.logos);
      toast.success("Logo removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusySlot(null);
    }
  };

  const uploadedCount = Object.keys(logos).length;
  const phase2Ready = Boolean(logos.main);
  const businessName = (profileFull?.business_name as string | null) ?? "this project";

  const continueToPhase3 = async () => {
    if (!selectedId) return;
    if (!phase2Ready) {
      toast.error("Upload at least the Main Logo to continue");
      return;
    }
    try {
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
              <div className="text-sm font-semibold tracking-tight">Phase 2 — Upload Logo Designs</div>
              <div className="text-xs text-muted-foreground">
                Upload up to 6 finalized logo files. They transfer into Phase 3 — Brand Kit.
              </div>
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
              <SelectTrigger>
                <SelectValue placeholder={profiles.length ? "Pick a saved profile" : "No saved profiles yet"} />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span className="text-sm">{p.business_name || "Untitled"}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {p.industry || "—"} · {p.project_status || "—"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {selectedId && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Project</div>
              <div className="text-sm font-semibold">{businessName}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Uploaded: <span className="font-semibold text-foreground">{uploadedCount}</span> / {LOGO_SLOTS.length}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {phase2Ready ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Main Logo ready
                  </span>
                ) : (
                  "Main Logo required to continue."
                )}
              </div>
            </div>
          )}

          <Button onClick={continueToPhase3} disabled={!selectedId || !phase2Ready} className="w-full">
            Continue to Phase 3 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </aside>

        <section className="space-y-6">
          {!selectedId && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Pick a Phase 1 profile in the sidebar to start uploading logo files.
            </div>
          )}

          {selectedId && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold tracking-tight inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload Logo Designs
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload up to 6 logo files. These transfer directly into the Phase 3 Brand Kit.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {LOGO_SLOTS.map((slot) => {
                  const url = logos[slot.key];
                  const isBusy = busySlot === slot.key;
                  const isDark = slot.key === "white";
                  return (
                    <div key={slot.key} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{slot.label}</div>
                          <div className="text-[11px] text-muted-foreground">{slot.description}</div>
                        </div>
                        {url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isBusy}
                            onClick={() => handleRemove(slot.key)}
                            aria-label="Remove logo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div
                        className={`mt-3 flex h-32 items-center justify-center overflow-hidden rounded-md border border-border ${
                          isDark ? "bg-neutral-900" : "bg-muted/40"
                        }`}
                      >
                        {url ? (
                          <img src={url} alt={slot.label} className="h-full w-full object-contain p-2" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <label className="mt-3 inline-flex w-full">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(slot.key, f);
                            e.target.value = "";
                          }}
                        />
                        <Button asChild size="sm" variant="outline" disabled={isBusy} className="w-full">
                          <span>
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {url ? "Replace" : "Upload"}
                          </span>
                        </Button>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
