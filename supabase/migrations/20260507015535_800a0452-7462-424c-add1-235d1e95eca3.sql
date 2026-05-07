
CREATE TABLE public.creative_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_profile_id UUID NOT NULL,
  brief_json JSONB,
  final_prompt TEXT,
  negative_prompt TEXT,
  revision_of UUID REFERENCES public.creative_briefs(id) ON DELETE SET NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.creative_briefs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.generated_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_profile_id UUID NOT NULL,
  creative_brief_id UUID REFERENCES public.creative_briefs(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  prompt_used TEXT,
  design_type TEXT,
  revision_number INT NOT NULL DEFAULT 0,
  parent_design_id UUID REFERENCES public.generated_designs(id) ON DELETE SET NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.generated_designs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_generated_designs_profile ON public.generated_designs(brand_profile_id, created_at DESC);

CREATE TABLE public.revision_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_profile_id UUID NOT NULL,
  generated_design_id UUID REFERENCES public.generated_designs(id) ON DELETE SET NULL,
  user_request TEXT NOT NULL,
  revised_prompt TEXT,
  revised_image_url TEXT,
  new_design_id UUID REFERENCES public.generated_designs(id) ON DELETE SET NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.revision_requests FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('ab-designs', 'ab-designs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ab-designs public read" ON storage.objects FOR SELECT USING (bucket_id = 'ab-designs');
CREATE POLICY "ab-designs public write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ab-designs');
CREATE POLICY "ab-designs public update" ON storage.objects FOR UPDATE USING (bucket_id = 'ab-designs');
CREATE POLICY "ab-designs public delete" ON storage.objects FOR DELETE USING (bucket_id = 'ab-designs');
