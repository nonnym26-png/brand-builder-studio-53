
CREATE TABLE IF NOT EXISTS public.brand_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_profile_id uuid NOT NULL,
  package_id text,
  package_name text,
  client_proof_id uuid,
  selected_concept jsonb,
  business_name text,
  client_name text,
  status text NOT NULL DEFAULT 'draft',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_total numeric,
  due_date date,
  fulfillment text,
  production_notes text,
  internal_notes text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  client_response_kind text,
  client_response_notes text,
  client_responded_at timestamptz,
  sent_to_client_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read order by token" ON public.brand_orders FOR SELECT USING (true);
CREATE POLICY "Public can create order" ON public.brand_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update order" ON public.brand_orders FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER trg_brand_orders_updated_at
  BEFORE UPDATE ON public.brand_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
