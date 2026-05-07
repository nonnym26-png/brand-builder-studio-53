import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Copy, ExternalLink, ChevronRight, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listAllOrders, setOrderStatus, type BrandOrder, type OrderStatus } from "@/api/brandOrders.functions";

type ColDef = { id: OrderStatus; label: string; tone: string };
const COLUMNS: ColDef[] = [
  { id: "draft", label: "Draft", tone: "border-foreground/20 bg-muted/40" },
  { id: "awaiting_client", label: "Awaiting Client Approval", tone: "border-amber-500/40 bg-amber-500/5" },
  { id: "approved", label: "Approved", tone: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "in_production", label: "In Production", tone: "border-sky-500/40 bg-sky-500/5" },
  { id: "ready", label: "Ready for Pickup / Delivery", tone: "border-violet-500/40 bg-violet-500/5" },
  { id: "completed", label: "Completed", tone: "border-emerald-600/40 bg-emerald-600/10" },
];
const NEXT: Record<OrderStatus, OrderStatus | null> = {
  draft: "awaiting_client",
  awaiting_client: "approved",
  approved: "in_production",
  in_production: "ready",
  ready: "completed",
  completed: null,
};

type Filter = "all" | OrderStatus | "overdue";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "awaiting_client", label: "Awaiting Approval" },
  { id: "approved", label: "Approved" },
  { id: "in_production", label: "In Production" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "overdue", label: "Overdue" },
];

function isOverdue(o: BrandOrder) {
  if (!o.due_date || o.status === "completed") return false;
  const d = new Date(o.due_date); d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

function logoFromConcept(c: unknown): string | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  return (o.image_url as string) || (o.imageUrl as string) || (o.preview_url as string) || null;
}

export function ProductionBoard({ onOpenProject }: { onOpenProject?: (id: string) => void }) {
  const [orders, setOrders] = useState<BrandOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openOrder, setOpenOrder] = useState<BrandOrder | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listAllOrders();
      setOrders(r.orders);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load orders"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (q && !((o.business_name || "").toLowerCase().includes(q) || (o.client_name || "").toLowerCase().includes(q))) return false;
      if (filter === "all") return true;
      if (filter === "overdue") return isOverdue(o);
      return o.status === filter;
    });
  }, [orders, search, filter]);

  const grouped = useMemo(() => {
    const m: Record<OrderStatus, BrandOrder[]> = { draft: [], awaiting_client: [], approved: [], in_production: [], ready: [], completed: [] };
    filtered.forEach((o) => { m[o.status]?.push(o); });
    return m;
  }, [filtered]);

  const move = async (o: BrandOrder, status: OrderStatus) => {
    setBusyId(o.id);
    try { await setOrderStatus({ data: { id: o.id, status } }); toast.success("Status updated"); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusyId(null); }
  };

  return (
    <section id="production-board" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Order Production Board</h2>
          <p className="text-[11px] text-muted-foreground">Kanban command center for all branding package orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input className="h-8 w-56 pl-7 text-xs" placeholder="Search business or client" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`text-[11px] px-2 py-1 rounded border ${filter === f.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{f.label}</button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No orders yet. Create order drafts from approved Brand Packages.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.id} className={`rounded-xl border ${col.tone} p-2 min-h-[120px]`}>
              <div className="flex items-center justify-between px-1 pb-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest">{col.label}</div>
                <Badge variant="outline" className="text-[10px]">{grouped[col.id].length}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[col.id].map((o) => (
                  <ProductionCard key={o.id} order={o} busy={busyId === o.id}
                    onOpen={() => setOpenOrder(o)}
                    onCopyLink={() => { navigator.clipboard.writeText(`${window.location.origin}/order/${o.token}`); toast.success("Client link copied"); }}
                    onNext={() => { const n = NEXT[o.status]; if (n) move(o, n); }}
                    onComplete={() => move(o, "completed")}
                    onOpenProject={() => onOpenProject?.(o.brand_profile_id)}
                  />
                ))}
                {grouped[col.id].length === 0 && (
                  <div className="text-[10px] text-muted-foreground/70 px-1 py-2">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {openOrder && <OrderDetailModal order={openOrder} onClose={() => setOpenOrder(null)} onOpenProject={() => { onOpenProject?.(openOrder.brand_profile_id); setOpenOrder(null); }} />}
    </section>
  );
}

function ProductionCard({ order, busy, onOpen, onCopyLink, onNext, onComplete, onOpenProject }: {
  order: BrandOrder; busy: boolean; onOpen: () => void; onCopyLink: () => void; onNext: () => void; onComplete: () => void; onOpenProject: () => void;
}) {
  const overdue = isOverdue(order);
  const total = order.estimated_total ?? order.items.reduce((s, i) => s + (Number(i.estimated_price) || 0) * (Number(i.quantity) || 0), 0);
  const logo = logoFromConcept(order.selected_concept);
  const next = NEXT[order.status];
  const proofKind = order.client_response_kind;

  return (
    <div className="rounded-lg border border-border bg-background p-2 text-xs">
      <div className="flex items-start gap-2">
        <div className="h-10 w-10 shrink-0 rounded-md border border-border bg-muted/40 overflow-hidden flex items-center justify-center">
          {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] text-muted-foreground">No logo</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{order.business_name || "—"}</div>
          <div className="text-[10px] text-muted-foreground truncate">{order.client_name || "—"} · {order.package_name || "Order"}</div>
        </div>
        {overdue && <Badge variant="destructive" className="text-[9px] gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Overdue</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
        <Badge variant="outline">{order.items.length} items</Badge>
        {total > 0 && <Badge variant="outline">${total.toFixed(2)}</Badge>}
        {order.fulfillment && <Badge variant="outline">{order.fulfillment.replace("_", " ")}</Badge>}
        {order.due_date && <Badge variant="outline" className={overdue ? "border-destructive text-destructive" : ""}>Due {new Date(order.due_date).toLocaleDateString()}</Badge>}
        {proofKind && <Badge variant="outline" className={proofKind === "approve" ? "text-emerald-700" : "text-amber-700"}>{proofKind === "approve" ? "Approved" : "Changes"}</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onOpen}>View</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onOpenProject}>Edit</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onCopyLink}><Copy className="h-2.5 w-2.5" /> Link</Button>
        {next && <Button size="sm" variant="default" className="h-6 px-2 text-[10px]" disabled={busy} onClick={onNext}><ChevronRight className="h-2.5 w-2.5" /> Next</Button>}
        {order.status !== "completed" && <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={busy} onClick={onComplete}><CheckCircle2 className="h-2.5 w-2.5" /> Complete</Button>}
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onOpenProject }: { order: BrandOrder; onClose: () => void; onOpenProject: () => void }) {
  const logo = logoFromConcept(order.selected_concept);
  const total = order.estimated_total ?? order.items.reduce((s, i) => s + (Number(i.estimated_price) || 0) * (Number(i.quantity) || 0), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-xl border border-border w-full max-w-3xl max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-14 w-14 shrink-0 rounded-md border border-border bg-muted/40 overflow-hidden flex items-center justify-center">
              {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">No logo</span>}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{order.business_name || "—"}</div>
              <div className="text-xs text-muted-foreground">{order.client_name || "—"} · {order.package_name || "Order"}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Created {new Date(order.created_at).toLocaleDateString()}{order.due_date ? ` · Due ${new Date(order.due_date).toLocaleDateString()}` : ""}</div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex flex-wrap gap-1 mb-4 text-[10px]">
          <Badge variant="outline">Status: {order.status.replace("_", " ")}</Badge>
          <Badge variant="outline">{order.items.length} items</Badge>
          {total > 0 && <Badge variant="outline">Est. ${total.toFixed(2)}</Badge>}
          {order.fulfillment && <Badge variant="outline">{order.fulfillment.replace("_", " ")}</Badge>}
          {order.client_response_kind && <Badge variant="outline">Client: {order.client_response_kind === "approve" ? "Approved" : "Requested changes"}</Badge>}
        </div>

        <div className="rounded-md border border-border mb-4">
          <div className="px-3 py-2 border-b border-border text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Line items</div>
          <div className="divide-y divide-border">
            {order.items.length === 0 && <div className="p-3 text-xs text-muted-foreground">No items.</div>}
            {order.items.map((i) => (
              <div key={i.id} className="p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{i.name} <span className="text-muted-foreground">× {i.quantity}</span></div>
                  {i.estimated_price != null && <div className="text-muted-foreground">${Number(i.estimated_price).toFixed(2)} ea</div>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  {i.size && <Badge variant="outline">Size: {i.size}</Badge>}
                  {i.material && <Badge variant="outline">Material: {i.material}</Badge>}
                  {i.color && <Badge variant="outline">Color: {i.color}</Badge>}
                  {i.print_location && <Badge variant="outline">Print: {i.print_location}</Badge>}
                  <Badge variant="outline">Proof: {i.proof_status || "pending"}</Badge>
                  <Badge variant="outline">Approval: {i.approval_status || "pending"}</Badge>
                </div>
                {i.notes && <div className="mt-1 text-[11px] text-muted-foreground">{i.notes}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 mb-4">
          {order.production_notes && (
            <div className="rounded-md border border-border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Production notes</div>
              <div className="text-xs whitespace-pre-wrap">{order.production_notes}</div>
            </div>
          )}
          {order.internal_notes && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-amber-700 mb-1">Internal notes (admin only)</div>
              <div className="text-xs whitespace-pre-wrap">{order.internal_notes}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Button size="sm" variant="outline" onClick={onOpenProject}>Open Brand Profile</Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/order/${order.token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /> Client view</a>
          </Button>
          {order.client_proof_id && <Badge variant="outline">Linked proof: {order.client_proof_id.slice(0, 8)}…</Badge>}
          <Badge variant="outline">Profile: {order.brand_profile_id.slice(0, 8)}…</Badge>
        </div>
      </div>
    </div>
  );
}