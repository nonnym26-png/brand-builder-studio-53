import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getOrderByToken, submitClientOrderResponse } from "@/api/brandOrders.functions";

export const Route = createFileRoute("/order/$token")({ component: OrderProofPage });

function OrderProofPage() {
  const { token } = Route.useParams();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrderByToken>>["order"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getOrderByToken({ data: { token } })
      .then((r) => setOrder(r.order))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (kind: "approve" | "request_changes") => {
    if (kind === "request_changes" && !notes.trim()) { toast.error("Please share what you'd like changed."); return; }
    setBusy(true);
    try {
      await submitClientOrderResponse({ data: { token, kind, notes: notes.trim() || undefined } });
      toast.success(kind === "approve" ? "Order approved. Thank you!" : "Change request sent.");
      const r = await getOrderByToken({ data: { token } });
      setOrder(r.order);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Submit failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Order not found.</div>;

  type Item = { id: string; name: string; quantity: number; size?: string; material?: string; color?: string; print_location?: string; notes?: string; estimated_price?: number | null };
  const items = (order.items as unknown as Item[]) || [];
  const computedTotal = items.reduce((s, i) => s + (Number(i.estimated_price) || 0) * (Number(i.quantity) || 0), 0);
  const total = order.estimated_total != null ? Number(order.estimated_total) : computedTotal;
  const responded = !!order.client_responded_at;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Order Proposal</div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{order.business_name || "Your Order"}</h1>
          <div className="text-sm text-muted-foreground mt-1">{order.package_name || "Branding package"}</div>
        </header>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Items</h2>
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="py-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {[i.size && `Size: ${i.size}`, i.material && `Material: ${i.material}`, i.color && `Color: ${i.color}`, i.print_location && `Location: ${i.print_location}`].filter(Boolean).join(" · ")}
                  </div>
                  {i.notes && <div className="text-[11px] text-foreground/70 mt-0.5">{i.notes}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm">× {i.quantity}</div>
                  {i.estimated_price != null && <div className="text-[11px] text-muted-foreground">${Number(i.estimated_price).toFixed(2)} ea</div>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold">Estimated total</span>
            <span className="text-sm font-semibold">${total.toFixed(2)}</span>
          </div>
          {(order.production_notes || order.due_date || order.fulfillment) && (
            <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              {order.due_date && <div>Target completion: {new Date(order.due_date).toLocaleDateString()}</div>}
              {order.fulfillment && <div>Fulfillment: {order.fulfillment.replace("_", " ")}</div>}
              {order.production_notes && <div className="rounded-md border border-border p-2 mt-1 text-foreground/80">{order.production_notes}</div>}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Your decision</h2>
          {responded ? (
            <Badge variant={order.client_response_kind === "approve" ? "default" : "outline"}>
              {order.client_response_kind === "approve" ? "Approved" : "Changes requested"} · {new Date(order.client_responded_at!).toLocaleString()}
            </Badge>
          ) : (
            <div className="space-y-3">
              <Textarea rows={3} placeholder="Optional notes or changes…" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
              <div className="flex gap-2">
                <Button onClick={() => submit("approve")} disabled={busy}><Check className="h-4 w-4" /> Approve order</Button>
                <Button variant="outline" onClick={() => submit("request_changes")} disabled={busy}><MessageSquare className="h-4 w-4" /> Request changes</Button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}