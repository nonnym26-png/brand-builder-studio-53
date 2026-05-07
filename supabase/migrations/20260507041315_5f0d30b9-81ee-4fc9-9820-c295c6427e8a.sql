CREATE TABLE public.client_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_profile_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  business_name TEXT,
  selected_direction TEXT,
  asset_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  response_kind TEXT,
  response_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_proofs_token ON public.client_proofs(token);
CREATE INDEX idx_client_proofs_brand ON public.client_proofs(brand_profile_id);

ALTER TABLE public.client_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read proofs by token"
ON public.client_proofs FOR SELECT
USING (true);

CREATE POLICY "Public can submit proof response"
ON public.client_proofs FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can create proofs"
ON public.client_proofs FOR INSERT
WITH CHECK (true);

CREATE TRIGGER client_proofs_set_updated_at
BEFORE UPDATE ON public.client_proofs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();