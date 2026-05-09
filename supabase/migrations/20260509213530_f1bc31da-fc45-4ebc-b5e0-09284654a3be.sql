create table if not exists public.generated_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  concept_name text not null,
  prompt text not null,
  image_url text,
  status text default 'generated',
  created_at timestamptz not null default now()
);

create table if not exists public.concept_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  original_concept_id uuid,
  refinement_instruction text not null,
  prompt text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.approved_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  concept_id uuid,
  image_url text,
  approved_prompt text,
  approved_at timestamptz not null default now()
);

alter table public.generated_concepts enable row level security;
alter table public.concept_revisions enable row level security;
alter table public.approved_concepts enable row level security;

create policy "open all" on public.generated_concepts for all using (true) with check (true);
create policy "open all" on public.concept_revisions for all using (true) with check (true);
create policy "open all" on public.approved_concepts for all using (true) with check (true);

create index if not exists idx_generated_concepts_project on public.generated_concepts(project_id, created_at desc);
create index if not exists idx_concept_revisions_project on public.concept_revisions(project_id, created_at desc);
create index if not exists idx_approved_concepts_project on public.approved_concepts(project_id, approved_at desc);

insert into storage.buckets (id, name, public)
values ('brand-concepts', 'brand-concepts', true)
on conflict (id) do nothing;

create policy "brand-concepts public read"
on storage.objects for select
using (bucket_id = 'brand-concepts');

create policy "brand-concepts public insert"
on storage.objects for insert
with check (bucket_id = 'brand-concepts');

create policy "brand-concepts public update"
on storage.objects for update
using (bucket_id = 'brand-concepts');

create policy "brand-concepts public delete"
on storage.objects for delete
using (bucket_id = 'brand-concepts');