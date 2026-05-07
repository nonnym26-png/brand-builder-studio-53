import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Copy, ExternalLink, Send, Sparkles, Check, Package, Truck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listClientProofs, actOnClientProof, markProofDelivered } from "@/api/clientProof.functions";

type Proof = {
  id: string;
  brand_profile_id: string;
  token: string;
  business_name: string | null;
  selected_direction: string | null;
  status: string;
  response_notes: string | null;
  created_at: string;
  submitted_at: string | null;
  acted_at: string | null;
  acted_kind: string | null;
  profile: { id: string; business_name: string | null; client_name: string | null; industry: string | null } | null;
  preview: { id: string; image_url: string; design_type: string | null } | null;
};

type Filter = "all" | "pending" | "approve_final" | "minor_revision" | "full_redesign";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approve_final", label: "Approved" },
  { id: "minor_revision", label: "Minor Revision" },
  { id: "full_redesign", label: "New Direction" },
];

const GROUPS: { id: Exclude<Filter, "all">; label: string; tone: string }[] = [
  { id: "pending", label: "Pending Review", tone: "border-amber-500/40 bg-amber-500/5" },
  { id: "approve_final", label: "Approved as Final", tone: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "minor_revision", label: "Minor Revision Requested", tone: "border-sky-500/40 bg-sky-500/5" },
  { id: "full_redesign", label: "New Direction Requested", tone: "border-rose-500/40 bg-rose-500/5" },
];

export function ClientProofQueue({ onOpenProject }: { onOpenProject?: (brandProfileId: string) => void }) {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listClientProofs();
      setProofs(r.proofs as Proof[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load proofs");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proofs.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (q) {
        const hay = `${p.business_name || ""} ${p.profile?.business_name || ""} ${p.profile?.client_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [proofs, filter, search]);

  const grouped = useMemo(() => {
    const g: Record<string, Proof[]> = { pending: [], approve_final: [], minor_revision: [], full_redesign: [] };
    for (const p of filtered) {
      if (g[p.status]) g[p.status].push(p);
    }
    return g;
  }, [filtered]);

  const onCopy = (token: string) => {
    const url = `${window.location.origin}/proof/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Proof link copied");
  };

  const onAct = async (p: Proof) => {
    setBusyId(p.id);
    try {
      const r = await actOnClientProof({ data: { proofId: p.id } });
      toast.success(r.kind === "minor_revision" ? "Revision created" : "New concept group generated");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const onDelivered = async (p: Proof) => {
    setBusyId(p.id);
    try {
      await markProofDelivered({ data: { proofId: p.id } });
      toast.success("Marked delivered");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Client Proof Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-1">All proofs sent to clients, grouped by status. Take action without leaving the engine.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business name…" className="h-8 pl-7 w-56 text-xs" />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id)}>
              {f.label}
              <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">
                {f.id === "all" ? proofs.length : proofs.filter((p) => p.status === f.id).length}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {GROUPS.map((g) => {
          const items = grouped[g.id] || [];
          if (filter !== "all" && filter !== g.id) return null;
          return (
            <div key={g.id}>
              <h3 className={`text-xs font-semibold uppercase tracking-widest mb-2 inline-flex items-center gap-2 px-2 py-1 rounded border ${g.tone}`}>
                {g.label} <span className="opacity-60">· {items.length}</span>
              </h3>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border p-4">No proofs in this group.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((p) => (
                    <ProofCard key={p.id} proof={p} busy={busyId === p.id} onCopy={() => onCopy(p.token)} onAct={() => onAct(p)} onDelivered={() => onDelivered(p)} onOpenProject={onOpenProject} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProofCard({ proof, busy, onCopy, onAct, onDelivered, onOpenProject }: { proof: Proof; busy: boolean; onCopy: () => void; onAct: () => void; onDelivered: () => void; onOpenProject?: (id: string) => void }) {
  const acted = !!proof.acted_at;
  return (
    <div className="rounded-xl border border-border bg-background p-3 flex gap-3">
      <div className="h-20 w-20 shrink-0 rounded-md bg-muted/40 grid place-items-center overflow-hidden">
        {proof.preview ? (
          <img src={proof.preview.image_url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[10px] text-muted-foreground">No preview</span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold truncate">{proof.business_name || proof.profile?.business_name || "Untitled"}</div>
          {acted && <Badge variant="secondary" className="text-[10px]">Actioned</Badge>}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {proof.profile?.client_name && <>{proof.profile.client_name} · </>}
          Sent {new Date(proof.created_at).toLocaleDateString()}
          {proof.submitted_at && <> · Replied {new Date(proof.submitted_at).toLocaleDateString()}</>}
        </div>
        {proof.selected_direction && (
          <div className="text-[11px] text-muted-foreground line-clamp-2"><strong className="text-foreground">Direction:</strong> {proof.selected_direction}</div>
        )}
        {proof.response_notes && (
          <div className="text-[11px] rounded-md bg-muted/40 border border-border p-2"><strong>Client notes:</strong> {proof.response_notes}</div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" variant="outline" asChild>
            <a href={`/proof/${proof.token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /> Open Proof</a>
          </Button>
          <Button size="sm" variant="outline" onClick={onCopy}><Copy className="h-3 w-3" /> Copy Link</Button>
          {onOpenProject && (
            <Button size="sm" variant="outline" onClick={() => onOpenProject(proof.brand_profile_id)}>
              View Project
            </Button>
          )}
          {proof.status === "approve_final" && (
            <>
              <Button size="sm" variant="default" disabled={busy} onClick={() => onOpenProject?.(proof.brand_profile_id)}>
                <Package className="h-3 w-3" /> Prepare Final Brand Kit
              </Button>
              <Button size="sm" variant={acted ? "secondary" : "outline"} disabled={busy || acted} onClick={onDelivered}>
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                {acted ? "Delivered" : "Mark Delivered"}
              </Button>
            </>
          )}
          {proof.status === "minor_revision" && (
            <Button size="sm" variant="default" disabled={busy || acted} onClick={onAct}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {acted ? "Revision Created" : "Create Revision"}
            </Button>
          )}
          {proof.status === "full_redesign" && (
            <Button size="sm" variant="default" disabled={busy || acted} onClick={onAct}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {acted ? "New Group Created" : "Generate New Concept Group"}
            </Button>
          )}
          {proof.status === "pending" && (
            <Badge variant="outline" className="text-[10px] inline-flex items-center gap-1"><Check className="h-3 w-3" /> Awaiting client</Badge>
          )}
        </div>
      </div>
    </div>
  );
}