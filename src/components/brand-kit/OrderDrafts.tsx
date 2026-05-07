import { useEffect, useMemo, useState } from "react";
import { Loader2, FileText, Send, Copy, Check, Hammer, Truck, CheckCircle2, Trash2, Pencil, Save, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listOrdersForProfile, updateOrder, setOrderStatus, deleteOrder, type BrandOrder, type OrderItem, type OrderStatus } from "@/api/brandOrders.functions";

const STATUS_FLOW: { id: OrderStatus; label: string; tone: string }[] = [
  { id: "draft", label: "Draft", tone: "border-foreground/20 bg-muted/40 text-foreground" },
  { id: "awaiting_client", label: "Awaiting Client Approval", tone: "border-amber-500/40 bg-amber-500/5 text-amber-700" },
  { id: "approved", label: "Approved", tone: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700" },
  { id: "in_production", label: "In Production", tone: "border-sky-500/40 bg-sky-500/5 text-sky-700" },
  { id: "ready", label: "Ready for Pickup / Delivery", tone: "border-violet-500/40 bg-violet-500/5 text-violet-700" },
  { id: "completed", label: "Completed", tone: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700" },
];

function statusMeta(s: OrderStatus) { return STATUS_FLOW.find((x) => x.id === s) || STATUS_FLOW[0]; }
function uid() { return Math.random().toString(36).slice(2, 10); }

export function OrderDrafts({ brandProfileId, refreshKey }: { brandProfileId: string | null; refreshKey?: number }) {
  const [orders, setOrders] = useState<BrandOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => {
    if (!brandProfileId) { setOrders([]); return; }
    setLoading(true);
    try {
      const r = await listOrdersForProfile({ data: { brandProfileId } });
      setOrders(r.orders);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load orders"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [brandProfileId, refreshKey]);

  if (!brandProfileId) return null;
  if (orders.length === 0 && !loading) return (
    <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      No order drafts yet. Use "Create Order Draft" on a package above to start one.
    </div>
  );

  return (
    <div className="space-y-3">
      {loading && <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading orders…</div>}
      {orders.map((o) => (
        <OrderCard
          key={o.id}
          order={o}
          open={openId === o.id}
          busy={busyId === o.id}
          onToggle={() => setOpenId(openId === o.id ? null : o.id)}
          onSave={async (patch) => {
            setBusyId(o.id);
            try { await updateOrder({ data: { id: o.id, patch } }); toast.success("Saved"); await refresh(); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
            finally { setBusyId(null); }
          }}
          onStatus={async (status, markSent) => {
            setBusyId(o.id);
            try { await setOrderStatus({ data: { id: o.id, status, markSent } }); toast.success(`Marked ${statusMeta(status).label}`); await refresh(); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
            finally { setBusyId(null); }
          }}
          onDelete={async () => {
            if (!confirm("Delete this order draft?")) return;
            setBusyId(o.id);
            try { await deleteOrder({ data: { id: o.id } }); toast.success("Deleted"); await refresh(); }
            finally { setBusyId(null); }
          }}
        />
      ))}
    </div>
  );
}

function OrderCard({ order, open, busy, onToggle, onSave, onStatus, onDelete }: {
  order: BrandOrder;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onSave: (patch: Partial<BrandOrder>) => Promise<void>;
  onStatus: (status: OrderStatus, markSent?: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [items, setItems] = useState<OrderItem[]>(order.items || []);
  const [name, setName] = useState(order.package_name || "Order");
  const [due, setDue] = useState(order.due_date || "");
  const [fulfillment, setFulfillment] = useState(order.fulfillment || "pickup");
  const [prodNotes, setProdNotes] = useState(order.production_notes || "");
  const [internal, setInternal] = useState(order.internal_notes || "");
  const [estTotal, setEstTotal] = useState<string>(order.estimated_total != null ? String(order.estimated_total) : "");

  useEffect(() => {
    setItems(order.items || []);
    setName(order.package_name || "Order");
    setDue(order.due_date || "");
    setFulfillment(order.fulfillment || "pickup");
    setProdNotes(order.production_notes || "");
    setInternal(order.internal_notes || "");
    setEstTotal(order.estimated_total != null ? String(order.estimated_total) : "");
  }, [order]);

  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.estimated_price) || 0) * (Number(i.quantity) || 0), 0), [items]);
  const meta = statusMeta(order.status);

  const updateItem = (id: string, patch: Partial<OrderItem>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const addItem = () => setItems((prev) => [...prev, { id: uid(), name: "New item", quantity: 1, proof_status: "pending", approval_status: "pending" }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const saveAll = async () => {
    await onSave({
      package_name: name,
      items,
      due_date: due || null,
      fulfillment: fulfillment || null,
      production_notes: prodNotes || null,
      internal_notes: internal || null,
      estimated_total: estTotal ? Number(estTotal) : null,
    });
  };

  const copyClientLink = () => {
    const url = `${window.location.origin}/order/${order.token}`;
    navigator.clipboard.writeText(url);
    toast.success("Client order link copied");
  };

  const sendForApproval = async () => {
    await saveAll();
    await onStatus("awaiting_client", true);
    copyClientLink();
  };

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight truncate">{name}</div>
          <div className="text-[11px] text-muted-foreground">
            {order.business_name || "—"}{order.client_name ? ` · ${order.client_name}` : ""} · {items.length} items · Est. ${total.toFixed(2)}
            {order.due_date && <> · Due {new Date(order.due_date).toLocaleDateString()}</>}
          </div>
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.tone}`}>{meta.label}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onToggle}>{open ? "Hide" : "Open"}</Button>
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Package name</Label>
              <Input className="h-8 mt-1 text-xs" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label className="text-[11px]">Estimated total ($)</Label>
              <Input className="h-8 mt-1 text-xs" type="number" min="0" value={estTotal} onChange={(e) => setEstTotal(e.target.value)} placeholder={`Auto: ${total.toFixed(2)}`} />
            </div>
            <div>
              <Label className="text-[11px]">Due date</Label>
              <Input className="h-8 mt-1 text-xs" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Pickup or delivery</Label>
              <select className="mt-1 w-full h-8 text-xs rounded-md border border-border bg-background px-2" value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
                <option value="pickup">Pickup</option>
                <option value="local_delivery">Local delivery</option>
                <option value="ship">Ship</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between p-2 border-b border-border">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Line Items</div>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3" /> Add item</Button>
            </div>
            <div className="divide-y divide-border">
              {items.map((i) => (
                <div key={i.id} className="p-2 grid gap-2 md:grid-cols-12 items-start">
                  <Input className="md:col-span-3 h-8 text-xs" value={i.name} onChange={(e) => updateItem(i.id, { name: e.target.value })} placeholder="Item name" />
                  <Input className="md:col-span-1 h-8 text-xs" type="number" min="0" value={i.quantity} onChange={(e) => updateItem(i.id, { quantity: Number(e.target.value) || 0 })} placeholder="Qty" />
                  <Input className="md:col-span-1 h-8 text-xs" value={i.size || ""} onChange={(e) => updateItem(i.id, { size: e.target.value })} placeholder="Size" />
                  <Input className="md:col-span-1 h-8 text-xs" value={i.material || ""} onChange={(e) => updateItem(i.id, { material: e.target.value })} placeholder="Material" />
                  <Input className="md:col-span-1 h-8 text-xs" value={i.color || ""} onChange={(e) => updateItem(i.id, { color: e.target.value })} placeholder="Color" />
                  <Input className="md:col-span-2 h-8 text-xs" value={i.print_location || ""} onChange={(e) => updateItem(i.id, { print_location: e.target.value })} placeholder="Print location" />
                  <Input className="md:col-span-1 h-8 text-xs" type="number" min="0" step="0.01" value={i.estimated_price ?? ""} onChange={(e) => updateItem(i.id, { estimated_price: e.target.value === "" ? null : Number(e.target.value) })} placeholder="$ each" />
                  <Input className="md:col-span-2 h-8 text-xs" value={i.notes || ""} onChange={(e) => updateItem(i.id, { notes: e.target.value })} placeholder="Notes" />
                  <div className="md:col-span-12 flex items-center gap-2 -mt-1">
                    <Badge variant="outline" className="text-[10px]">Proof: {i.proof_status || "pending"}</Badge>
                    <Badge variant="outline" className="text-[10px]">Approval: {i.approval_status || "pending"}</Badge>
                    <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={() => removeItem(i.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Production notes (client-facing)</Label>
              <Textarea className="mt-1 text-xs" rows={2} value={prodNotes} onChange={(e) => setProdNotes(e.target.value)} maxLength={1000} />
            </div>
            <div>
              <Label className="text-[11px]">Internal notes (admin only)</Label>
              <Textarea className="mt-1 text-xs" rows={2} value={internal} onChange={(e) => setInternal(e.target.value)} maxLength={1000} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={saveAll} disabled={busy}>{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save</Button>
            <Button size="sm" variant="default" onClick={sendForApproval} disabled={busy}><Send className="h-3 w-3" /> Send Order Approval</Button>
            <Button size="sm" variant="outline" onClick={copyClientLink}><Copy className="h-3 w-3" /> Copy Client Link</Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/order/${order.token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /> Preview</a>
            </Button>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" variant={order.status === "approved" ? "secondary" : "outline"} disabled={busy} onClick={() => onStatus("approved")}><Check className="h-3 w-3" /> Mark Approved</Button>
              <Button size="sm" variant={order.status === "in_production" ? "secondary" : "outline"} disabled={busy} onClick={() => onStatus("in_production")}><Hammer className="h-3 w-3" /> Move to Production</Button>
              <Button size="sm" variant={order.status === "ready" ? "secondary" : "outline"} disabled={busy} onClick={() => onStatus("ready")}><Truck className="h-3 w-3" /> Mark Ready</Button>
              <Button size="sm" variant={order.status === "completed" ? "secondary" : "outline"} disabled={busy} onClick={() => onStatus("completed")}><CheckCircle2 className="h-3 w-3" /> Mark Completed</Button>
            </div>
          </div>

          {order.client_response_kind && (
            <div className="rounded-md border border-border bg-muted/30 p-2 text-[11px]">
              <strong>Client response:</strong> {order.client_response_kind === "approve" ? "Approved" : "Requested changes"}
              {order.client_response_notes && <> — "{order.client_response_notes}"</>}
              {order.client_responded_at && <> · {new Date(order.client_responded_at).toLocaleString()}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}