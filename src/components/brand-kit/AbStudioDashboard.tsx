import { useEffect, useMemo, useState } from "react";
import {
  Loader2, RefreshCw, Search, Activity, AlertTriangle, FolderKanban, Send, RotateCw, Sparkles,
  Package, Truck, CheckCircle2, Star, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAbDashboard, type RangeKey } from "@/api/abDashboard.functions";

export type DashboardFocus =
  | { queue: "proof"; status?: "pending" | "approve_final" | "minor_revision" | "full_redesign" }
  | { queue: "delivery"; status?: "needs_final_kit" | "kit_prepared" | "sent" | "delivered" }
  | null;

type Props = {
  onFocus?: (focus: DashboardFocus) => void;
  onOpenProject?: (id: string) => void;
};

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export function AbStudioDashboard({ onFocus, onOpenProject }: Props) {
  const [range, setRange] = useState<RangeKey>("week");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAbDashboard>> | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await getAbDashboard({ data: { range } });
      setData(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [range]);

  const stats = data?.stats;
  const activity = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.activity || [];
    return q ? list.filter((a) => (a.business_name || "").toLowerCase().includes(q)) : list;
  }, [data, search]);
  const attention = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.attention || [];
    return q ? list.filter((a) => (a.business_name || "").toLowerCase().includes(q)) : list;
  }, [data, search]);

  const cards: { id: string; label: string; value: number | string; icon: React.ReactNode; tone: string; onClick?: () => void }[] = [
    { id: "active", label: "Active Projects", value: stats?.activeProjects ?? 0, icon: <FolderKanban className="h-4 w-4" />, tone: "border-foreground/15" },
    { id: "pending", label: "Pending Client Proofs", value: stats?.pendingProofs ?? 0, icon: <Send className="h-4 w-4" />, tone: "border-amber-500/40 bg-amber-500/5", onClick: () => onFocus?.({ queue: "proof", status: "pending" }) },
    { id: "minor", label: "Minor Revisions", value: stats?.minorRevisions ?? 0, icon: <RotateCw className="h-4 w-4" />, tone: "border-sky-500/40 bg-sky-500/5", onClick: () => onFocus?.({ queue: "proof", status: "minor_revision" }) },
    { id: "new_dir", label: "New Directions", value: stats?.newDirections ?? 0, icon: <Sparkles className="h-4 w-4" />, tone: "border-rose-500/40 bg-rose-500/5", onClick: () => onFocus?.({ queue: "proof", status: "full_redesign" }) },
    { id: "needs_kit", label: "Approved — Needs Kit", value: stats?.approvedNeedsKit ?? 0, icon: <Package className="h-4 w-4" />, tone: "border-amber-500/40 bg-amber-500/5", onClick: () => onFocus?.({ queue: "delivery", status: "needs_final_kit" }) },
    { id: "sent", label: "Final Kits Sent", value: stats?.finalKitsSent ?? 0, icon: <Truck className="h-4 w-4" />, tone: "border-violet-500/40 bg-violet-500/5", onClick: () => onFocus?.({ queue: "delivery", status: "sent" }) },
    { id: "delivered", label: "Delivered / Closed", value: stats?.delivered ?? 0, icon: <CheckCircle2 className="h-4 w-4" />, tone: "border-emerald-500/40 bg-emerald-500/5", onClick: () => onFocus?.({ queue: "delivery", status: "delivered" }) },
    { id: "quality", label: "Avg. Quality Score", value: stats?.avgQuality ?? 0, icon: <Star className="h-4 w-4" />, tone: "border-foreground/15" },
    { id: "kits", label: "Brand Kits Exported", value: stats?.totalKitsExported ?? 0, icon: <Package className="h-4 w-4" />, tone: "border-foreground/15" },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> AB Studio Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Operational overview of every active branding project. Click any card to filter the queue below.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business name…" className="h-8 pl-7 w-56 text-xs" />
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <Button key={r.id} size="sm" variant={range === r.id ? "default" : "outline"} onClick={() => setRange(r.id)}>{r.label}</Button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={c.onClick}
            disabled={!c.onClick}
            className={`text-left rounded-xl border p-3 transition ${c.tone} ${c.onClick ? "hover:border-foreground/40 cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <span className="text-foreground/70">{c.icon}</span>
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{c.value}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2 inline-flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> Recent Activity
          </h3>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity in this range.</p>
          ) : (
            <ul className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {activity.map((a, i) => (
                <li key={i} className="text-xs flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.business_name || "Untitled"} <span className="text-muted-foreground font-normal">— {a.label}</span></div>
                    <div className="text-[10px] text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
                  </div>
                  {onOpenProject && (
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => onOpenProject(a.brand_profile_id)}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2 inline-flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Projects Needing Attention
          </h3>
          {attention.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing needs attention. 🎉</p>
          ) : (
            <ul className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {attention.map((a, i) => (
                <li key={i} className="text-xs flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-background/60 border border-border">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.business_name || "Untitled"}</div>
                    <div className="text-[10px] text-muted-foreground">{a.label}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.kind.replace(/_/g, " ")}</Badge>
                  {onOpenProject && (
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => onOpenProject(a.brand_profile_id)}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}