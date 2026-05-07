import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type OrderStatus =
  | "draft"
  | "awaiting_client"
  | "approved"
  | "in_production"
  | "ready"
  | "completed";

export type OrderItem = {
  id: string;
  category?: string;
  name: string;
  quantity: number;
  size?: string;
  material?: string;
  print_location?: string;
  color?: string;
  notes?: string;
  estimated_price?: number | null;
  proof_status?: "pending" | "sent" | "approved" | "revisions";
  approval_status?: "pending" | "approved" | "rejected";
};

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type BrandOrder = {
  id: string;
  brand_profile_id: string;
  package_id: string | null;
  package_name: string | null;
  client_proof_id: string | null;
  selected_concept: Json;
  business_name: string | null;
  client_name: string | null;
  status: OrderStatus;
  items: OrderItem[];
  estimated_total: number | null;
  due_date: string | null;
  fulfillment: string | null;
  production_notes: string | null;
  internal_notes: string | null;
  token: string;
  client_response_kind: string | null;
  client_response_notes: string | null;
  client_responded_at: string | null;
  sent_to_client_at: string | null;
  created_at: string;
  updated_at: string;
};

function uid() { return Math.random().toString(36).slice(2, 10); }

export const createOrderFromPackage = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string; packageId: string }) => d)
  .handler(async ({ data }) => {
    const { data: profile, error } = await supabaseAdmin
      .from("brand_profiles")
      .select("id, business_name, client_name, brand_packages, selected_logo_concept, phase_2_concept_notes")
      .eq("id", data.brandProfileId)
      .maybeSingle();
    if (error || !profile) throw new Error("Brand profile not found");
    const pkgs = (profile.brand_packages as unknown as Array<{ id: string; name: string; tier?: string; items?: Array<{ label: string; why?: string }>; priceRange?: string | null }>) || [];
    const pkg = pkgs.find((p) => p.id === data.packageId);
    if (!pkg) throw new Error("Package not found in proposal");

    const { data: latestProof } = await supabaseAdmin
      .from("client_proofs")
      .select("id")
      .eq("brand_profile_id", data.brandProfileId)
      .eq("status", "approve_final")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const items: OrderItem[] = (pkg.items || []).map((i) => ({
      id: uid(),
      name: i.label,
      quantity: 1,
      notes: i.why || "",
      proof_status: "pending",
      approval_status: "pending",
    }));

    const { data: order, error: cErr } = await supabaseAdmin
      .from("brand_orders")
      .insert({
        brand_profile_id: data.brandProfileId,
        package_id: pkg.id,
        package_name: pkg.name,
        client_proof_id: latestProof?.id || null,
        selected_concept: profile.selected_logo_concept,
        business_name: profile.business_name,
        client_name: profile.client_name,
        status: "draft",
        items: items as unknown as never,
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);
    return { order: order as BrandOrder };
  });

export const listOrdersForProfile = createServerFn({ method: "GET" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("brand_orders")
      .select("*")
      .eq("brand_profile_id", data.brandProfileId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { orders: (rows || []) as BrandOrder[] };
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: rows, error } = await supabaseAdmin
      .from("brand_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { orders: (rows || []) as BrandOrder[] };
  });

export const updateOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Partial<Pick<BrandOrder, "status" | "items" | "estimated_total" | "due_date" | "fulfillment" | "production_notes" | "internal_notes" | "package_name">> }) => d)
  .handler(async ({ data }) => {
    const patch = data.patch as Record<string, unknown>;
    if ("items" in patch) patch.items = patch.items as unknown as never;
    const { error } = await supabaseAdmin.from("brand_orders").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: OrderStatus; markSent?: boolean }) => d)
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.markSent) patch.sent_to_client_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("brand_orders").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("brand_orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Client-facing
export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: order, error } = await supabaseAdmin
      .from("brand_orders")
      .select("id, brand_profile_id, package_name, business_name, client_name, status, items, estimated_total, due_date, fulfillment, production_notes, token, client_response_kind, client_responded_at, sent_to_client_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    // Strip internal fields. internal_notes intentionally not selected above.
    return { order };
  });

export const submitClientOrderResponse = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; kind: "approve" | "request_changes"; notes?: string }) => d)
  .handler(async ({ data }) => {
    const { data: order, error: gErr } = await supabaseAdmin
      .from("brand_orders")
      .select("id, status")
      .eq("token", data.token)
      .maybeSingle();
    if (gErr || !order) throw new Error("Order not found");
    if (!["awaiting_client", "draft"].includes(order.status)) {
      throw new Error("This order has already been responded to.");
    }
    const nextStatus: OrderStatus = data.kind === "approve" ? "approved" : "draft";
    const { error } = await supabaseAdmin
      .from("brand_orders")
      .update({
        status: nextStatus,
        client_response_kind: data.kind,
        client_response_notes: data.notes || null,
        client_responded_at: new Date().toISOString(),
      } as never)
      .eq("id", order.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });