import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, Truck, Package, Send, Copy, CheckCircle2, RotateCcw, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listFinalDeliveries, updateDelivery, reopenDelivery, type DeliveryStatus } from "@/api/finalDelivery.functions";
import { exportBrandKit } from "@/api/abCreativeEngine.functions";

type Delivery = {
  id: string;
  business_name: string | null;
  client_name: string | null;
  industry: string | null;
  selected_direction: string | null;
  final_approval_date: string | null;
  preview: { image_url: string; design_type: string | null } | null;
  delivery_status: DeliveryStatus;
  delivery_notes: string | null;
  final_file_link: string | null;
  delivery_date: string | null;
  internal_production_notes: string | null;
  brand_kit_exported_at: string | null;
  approved_asset_count: number;
};

type Filter = "all" | DeliveryStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_final_kit", label: "Needs Final Kit" },
  { id: "kit_prepared", label: "Final Kit Prepared" },
  { id: "sent", label: "Sent" },
  { id: "delivered", label: "Delivered" },
];

const STATUS_META: Record<DeliveryStatus, { label: string; tone: string }> = {
  needs_final_kit: { label: "Approved — Needs Final Kit", tone: "border-amber-500/40 bg-amber-500/5 text-amber-600" },
  kit_prepared: { label: "Final Kit Prepared", tone: "border-sky-500/40 bg-sky-500/5 text-sky-600" },
  sent: { label: "Sent to Client", tone: "border-violet-500/40 bg-violet-500/5 text-violet-600" },
  delivered: { label: "Delivered / Closed", tone: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600" },
};

export function FinalDeliveryTracker({ onOpenProject }: { onOpenProject?: (id: string) => void }) {
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listFinalDeliveries();
      setItems(r.deliveries as Delivery[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (filter !== "all" && d.delivery_status !== filter) return false;
      if (q) {
        const hay = `${d.business_name || ""} ${d.client_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filter, search]);

  const setStatus = async (d: Delivery, status: DeliveryStatus, extra: Partial<Delivery> = {}) => {
    setBusyId(d.id);
    try {
      await updateDelivery({ data: { brandProfileId: d.id, delivery_status: status, ...extra } });
      toast.success(`Marked: ${STATUS_META[status].label}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const onExportKit = async (d: Delivery) => {
    setBusyId(d.id);
    try {
      const r = await exportBrandKit({ data: { brandProfileId: d.id } });
      const bin = atob(r.zipBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = r.filename || "brand-kit.zip"; a.click();
      URL.revokeObjectURL(url);
      await updateDelivery({ data: { brandProfileId: d.id, brand_kit_exported_at: new Date().toISOString(), delivery_status: "kit_prepared" } });
      toast.success("Brand kit exported");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = (d: Delivery) => {
    if (!d.final_file_link) { toast.error("Add a Final File Link first"); return; }
    navigator.clipboard.writeText(d.final_file_link);
    toast.success("Download link copied");
  };

  const onReopen = async (d: Delivery) => {
    setBusyId(d.id);
    try {
      await reopenDelivery({ data: { brandProfileId: d.id } });
      toast.success("Project reopened");
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, needs_final_kit: 0, kit_prepared: 0, sent: 0, delivered: 0 };
    for (const d of items) c[d.delivery_status]++;
    return c;
  }, [items]);

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Final Delivery Tracker
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Approved projects from client sign-off through final delivery. Don't let approved work get lost.</p>
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
              <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{counts[f.id]}</Badge>
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border p-4 md:col-span-2">No deliveries match these filters yet.</p>
        )}
        {filtered.map((d) => (
          <DeliveryCard
            key={d.id}
            delivery={d}
            busy={busyId === d.id}
            expanded={expandedId === d.id}
            onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
            onExportKit={() => onExportKit(d)}
            onPrepare={() => setStatus(d, "kit_prepared")}
            onCopyLink={() => copyLink(d)}
            onMarkSent={() => setStatus(d, "sent")}
            onMarkDelivered={() => setStatus(d, "delivered", { delivery_date: new Date().toISOString() } as never)}
            onReopen={() => onReopen(d)}
            onSaveFields={async (patch) => {
              setBusyId(d.id);
              try {
                await updateDelivery({ data: { brandProfileId: d.id, ...patch } });
                toast.success("Saved");
                await refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Save failed");
              } finally { setBusyId(null); }
            }}
            onOpenProject={onOpenProject}
          />
        ))}
      </div>
    </section>
  );
}

function DeliveryCard({
  delivery: d, busy, expanded, onToggle, onExportKit, onPrepare, onCopyLink, onMarkSent, onMarkDelivered, onReopen, onSaveFields, onOpenProject,
}: {
  delivery: Delivery;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExportKit: () => void;
  onPrepare: () => void;
  onCopyLink: () => void;
  onMarkSent: () => void;
  onMarkDelivered: () => void;
  onReopen: () => void;
  onSaveFields: (patch: { delivery_notes?: string | null; final_file_link?: string | null; internal_production_notes?: string | null }) => void;
  onOpenProject?: (id: string) => void;
}) {
  const [notes, setNotes] = useState(d.delivery_notes || "");
  const [link, setLink] = useState(d.final_file_link || "");
  const [prod, setProd] = useState(d.internal_production_notes || "");
  const meta = STATUS_META[d.delivery_status];
  const closed = d.delivery_status === "delivered";

  return (
    <div className={`rounded-xl border bg-background p-3 ${closed ? "border-emerald-500/30" : "border-border"}`}>
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 rounded-md bg-muted/40 grid place-items-center overflow-hidden">
          {d.preview ? (
            <img src={d.preview.image_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">No preview</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold truncate">{d.business_name || "Untitled"}</div>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.tone}`}>{meta.label}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {d.client_name && <>{d.client_name} · </>}
            {d.final_approval_date ? <>Approved {new Date(d.final_approval_date).toLocaleDateString()}</> : "Approval date pending"}
            {d.delivery_date && <> · Delivered {new Date(d.delivery_date).toLocaleDateString()}</>}
          </div>
          {d.selected_direction && (
            <div className="text-[11px] text-muted-foreground line-clamp-2"><strong className="text-foreground">Direction:</strong> {d.selected_direction}</div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge variant="secondary">{d.approved_asset_count} approved asset{d.approved_asset_count === 1 ? "" : "s"}</Badge>
            {d.brand_kit_exported_at ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/40"><Package className="h-3 w-3 mr-1" /> Kit exported</Badge>
            ) : (
              <Badge variant="outline">Kit not exported</Badge>
            )}
            {closed && <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.delivery_status === "needs_final_kit" && (
          <>
            <Button size="sm" variant="default" disabled={busy} onClick={onExportKit}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />} Export Brand Kit
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={onPrepare}>
              <FileText className="h-3 w-3" /> Prepare Final Files
            </Button>
          </>
        )}
        {d.delivery_status === "kit_prepared" && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={onCopyLink}>
              <Copy className="h-3 w-3" /> Copy Download Link
            </Button>
            <Button size="sm" variant="default" disabled={busy} onClick={onMarkSent}>
              <Send className="h-3 w-3" /> Mark Sent to Client
            </Button>
          </>
        )}
        {d.delivery_status === "sent" && (
          <Button size="sm" variant="default" disabled={busy} onClick={onMarkDelivered}>
            <CheckCircle2 className="h-3 w-3" /> Mark Delivered / Closed
          </Button>
        )}
        {closed && (
          <Button size="sm" variant="outline" disabled={busy} onClick={onReopen}>
            <RotateCcw className="h-3 w-3" /> Reopen
          </Button>
        )}
        {onOpenProject && (
          <Button size="sm" variant="ghost" onClick={() => onOpenProject(d.id)}>
            <ExternalLink className="h-3 w-3" /> Open Project
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onToggle} className="ml-auto">
          {expanded ? "Hide details" : "Edit details"}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div>
            <Label className="text-[11px]">Final file link</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="https://…" value={link} disabled={closed} onChange={(e) => setLink(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Delivery notes (client-facing)</Label>
            <Textarea className="mt-1 text-xs" rows={2} value={notes} disabled={closed} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Internal production notes (admin only)</Label>
            <Textarea className="mt-1 text-xs" rows={2} value={prod} disabled={closed} onChange={(e) => setProd(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={busy || closed} onClick={() => onSaveFields({ delivery_notes: notes || null, final_file_link: link || null, internal_production_notes: prod || null })}>
              Save details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}