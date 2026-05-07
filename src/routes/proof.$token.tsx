import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getClientProof, submitClientProofResponse } from "@/api/clientProof.functions";

export const Route = createFileRoute("/proof/$token")({
  loader: async ({ params }) => getClientProof({ data: { token: params.token } }),
  component: ProofPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Proof not available</h1>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    </div>
  ),
  head: () => ({ meta: [{ title: "Logo Proof" }] }),
});

type Kind = "approve_final" | "minor_revision" | "full_redesign";

function ProofPage() {
  const { proof, profile, assets } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [notes, setNotes] = useState("");
  const submitted = proof.status !== "pending";

  const palette = [
    { name: profile?.primary_color_name || "Primary", hex: profile?.primary_hex },
    { name: profile?.secondary_color_name || "Secondary", hex: profile?.secondary_hex },
    { name: profile?.accent_color_name || "Accent", hex: profile?.accent_hex },
    { name: profile?.neutral_color_name || "Neutral", hex: profile?.neutral_hex },
  ].filter((c) => c.hex);

  const fonts = (profile?.phase_2_fonts as Record<string, string> | null) || {};

  // Pull featured assets by design_type
  const find = (re: RegExp) => assets.find((a) => re.test(a.design_type || ""));
  const main = find(/refined|premium|mascot|original|wordmark/i) || assets[0];
  const badge = find(/badge|emblem/i);
  const social = find(/favicon|social|icon/i);
  const transparent = find(/transparent production/i);
  const embroidery = find(/embroidery/i);
  const featured = [
    { label: "Main Logo", a: main },
    { label: "Badge / Emblem", a: badge },
    { label: "Social / Favicon", a: social },
    { label: "Transparent Production", a: transparent },
    { label: "Embroidery-Safe", a: embroidery },
  ].filter((x) => x.a);

  const submit = async () => {
    if (!kind) return;
    if (kind !== "approve_final" && !notes.trim()) {
      toast.error("Please add a short note so we can act on your request.");
      return;
    }
    setBusy(true);
    try {
      await submitClientProofResponse({ data: { token: proof.token, kind, notes: notes.trim() || undefined } });
      toast.success("Response submitted. Thank you!");
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Logo Proof · AB Branding</div>
          <h1 className="text-3xl font-semibold mt-1">{proof.business_name || profile?.business_name}</h1>
          {profile?.industry && <div className="text-sm text-muted-foreground mt-1">{profile.industry}</div>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {proof.selected_direction && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Selected Direction</h2>
            <p className="text-base leading-relaxed">{proof.selected_direction}</p>
          </section>
        )}

        {main && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Main Logo</div>
            <div className="aspect-[16/10] w-full bg-muted/40 rounded-xl grid place-items-center overflow-hidden">
              <img src={main.image_url} alt="Main logo" className="max-h-full max-w-full object-contain p-8" />
            </div>
          </section>
        )}

        {featured.length > 1 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Brand Marks</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(1).map(({ label, a }) => (
                <div key={a!.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted/40 grid place-items-center">
                    <img src={a!.image_url} alt={label} className="max-h-full max-w-full object-contain p-6" />
                  </div>
                  <div className="p-3 text-sm font-medium">{label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {palette.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Color Palette</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {palette.map((c) => (
                <div key={c.hex!} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="h-24" style={{ background: c.hex! }} />
                  <div className="p-3">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground uppercase">{c.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(fonts.heading || fonts.body) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Typography</h2>
            <div className="rounded-xl border border-border bg-card p-5 space-y-1 text-sm">
              {fonts.heading && <div><span className="text-muted-foreground">Heading:</span> <strong>{fonts.heading}</strong></div>}
              {fonts.body && <div><span className="text-muted-foreground">Body:</span> <strong>{fonts.body}</strong></div>}
            </div>
          </section>
        )}

        {(profile?.digital_usage_notes || profile?.print_production_notes) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Recommended Usage</h2>
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm leading-relaxed">
              {profile?.digital_usage_notes && <p>{profile.digital_usage_notes}</p>}
              {profile?.print_production_notes && <p>{profile.print_production_notes}</p>}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Your Response</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose one of the options below to let us know how to proceed.</p>

          {submitted ? (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">Response received</div>
              <div className="text-muted-foreground mt-1">
                Status: <strong>{labelFor(proof.status as Kind)}</strong>
              </div>
              {proof.response_notes && <p className="mt-2 whitespace-pre-wrap">{proof.response_notes}</p>}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 mt-4">
                <ChoiceCard active={kind === "approve_final"} onClick={() => setKind("approve_final")} icon={<Check className="h-4 w-4" />} title="Approve as Final" desc="The logo is ready. Proceed to final delivery." />
                <ChoiceCard active={kind === "minor_revision"} onClick={() => setKind("minor_revision")} icon={<RefreshCw className="h-4 w-4" />} title="Minor Revision" desc="Small tweaks needed before approval." />
                <ChoiceCard active={kind === "full_redesign"} onClick={() => setKind("full_redesign")} icon={<Sparkles className="h-4 w-4" />} title="New Direction" desc="Explore a different concept." />
              </div>
              {kind && kind !== "approve_final" && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-muted-foreground">Your notes</label>
                  <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={kind === "minor_revision" ? "e.g. Slightly bolder wordmark, tighten spacing under the mascot." : "What direction should we explore instead?"} className="mt-1" />
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <Button onClick={submit} disabled={!kind || busy} size="lg">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Submit response
                </Button>
              </div>
            </>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-6">
          Presented by AB Branding · This proof is confidential and intended for the client named above.
        </footer>
      </main>
    </div>
  );
}

function labelFor(k: Kind | string) {
  if (k === "approve_final") return "Approved as Final";
  if (k === "minor_revision") return "Minor Revision Requested";
  if (k === "full_redesign") return "New Direction Requested";
  return k;
}

function ChoiceCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border bg-background hover:border-primary/40"}`}
    >
      <div className="inline-flex items-center gap-2 text-sm font-semibold">{icon} {title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}