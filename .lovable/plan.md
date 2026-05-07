
# AB Creative Engine — Plan

A professional 2-stage AI workflow that replaces the current single-shot premium logo renderer. Stage 1 writes a creative brief + image prompt with a reasoning model. Stage 2 renders the image. Revisions reuse the locked brief and only mutate what the user asks for.

## Decisions (easiest path)
- **Text model**: `openai/gpt-5` via Lovable AI Gateway (no extra API key).
- **Image model**: `google/gemini-3-pro-image-preview` (Nano Banana Pro) via Gateway. True OpenAI `gpt-image-1` is not on the Gateway and would require adding your own `OPENAI_API_KEY` — skipped for v1.
- **Auth**: none (single-operator). Tables get a nullable `user_id` column for later.
- **Intake source**: existing `brand_profiles` row (Phase 1 + Phase 2 already collect everything in your spec). No new `projects` / `brand_intake` tables.

## Database (3 new tables, all RLS-disabled like existing pattern)

```text
creative_briefs
  id, brand_profile_id (fk), brief_json (jsonb), final_prompt (text),
  negative_prompt (text), revision_of (nullable fk creative_briefs.id),
  user_id (nullable), created_at

generated_designs
  id, brand_profile_id (fk), creative_brief_id (fk),
  image_url (text), prompt_used (text), design_type (text),
  revision_number (int default 0), parent_design_id (nullable),
  is_approved (bool default false), user_id (nullable), created_at

revision_requests
  id, brand_profile_id (fk), generated_design_id (fk),
  user_request (text), revised_prompt (text), revised_image_url (text),
  new_design_id (nullable fk generated_designs.id),
  user_id (nullable), created_at
```

Image storage: base64 from Gateway is uploaded to a new public Supabase Storage bucket `ab-designs/`; only the public URL is stored in DB. (Avoids storing huge base64 in Postgres.)

## Server functions (TanStack `createServerFn`, in `src/api/abCreativeEngine.functions.ts`)

1. `generateAbDesign({ brandProfileId, directionOverrides? })`
   - Loads `brand_profiles` row.
   - **Step A — Brief**: calls `openai/gpt-5` with tool-calling (structured JSON) to produce a creative brief: `{ concept, audience_lens, mood, mark_type, palette, typography, layout, usage_targets, do_not_list }`.
   - **Step B — Prompt**: second `openai/gpt-5` call that takes the brief + the Design DNA quality rules and emits `{ final_prompt, negative_prompt }`.
   - **Step C — Render**: calls `google/gemini-3-pro-image-preview` with `final_prompt`. Uploads PNG to `ab-designs/`.
   - Inserts `creative_briefs` + `generated_designs`. Returns the new design row.

2. `reviseAbDesign({ generatedDesignId, userRequest })`
   - Loads parent design + its locked brief.
   - Detects "start over" → routes to `generateAbDesign`.
   - Otherwise calls `openai/gpt-5` with the brief + user request + a fixed revision-intent map (your "more bold / less cartoon / more mascot / transparent background" definitions) to produce a **mutated prompt** that preserves business name, mark type, palette unless the user changes it.
   - Renders via Nano Banana Pro (or edits the previous image with the same model when the request is small — supported by Gateway image-edit). Uploads, inserts new `generated_designs` row with `parent_design_id` + `revision_number = parent + 1`, and a `revision_requests` row.

3. `listAbDesigns({ brandProfileId })` — gallery feed (newest first, grouped by `parent_design_id`).
4. `approveAbDesign({ generatedDesignId })` — flips `is_approved`.

All three use the existing `requireSupabaseAuth` pattern only if/when auth is added later; for now they're public server functions.

### Quality enforcement (built into Step B prompt)
The prompt-writer system message hard-codes your "Design Quality Rules":
exact business name spelling · limited palette · no mockup background unless requested · no clipart · explicit layout/typography/color direction · negative prompt always populated with: "blurry text, misspelled words, distorted letters, mockup scene, generic clipart, watermark, busy background, extra letters".

## UI changes

1. **`/phase-2` page** — replace the current "Premium Logo Render" section with an **AB Creative Engine** panel:
   - Big "Generate Design" button with the 5-step progress strip (Reviewing → Direction → Prompt → Rendering → Saving) animated by the server function lifecycle.
   - Below: **Generated Design Gallery** (grid of designs from `generated_designs`, newest first, with revision lineage shown as connected cards).
   - Per-card actions: View brief, View prompt, Download PNG, Approve, Revise.

2. **`RevisionRequestPanel`** (new component, `src/components/brand-kit/RevisionRequestPanel.tsx`)
   - Modal opened from a card.
   - Free-text "what should change?" + quick-chip buttons: "More professional", "More bold", "Less cartoon", "More mascot", "Transparent background", "Start over".
   - On submit calls `reviseAbDesign`.

3. **Brief / Prompt drawer** — read-only side panel showing `brief_json` (pretty) and `final_prompt` for transparency. Doubles as the admin view since you're solo.

4. **Phase 1 / Phase 2 forms**: no changes — existing `brand_profiles` schema already covers every spec field (industry, services, target customer, personality, colors, colors_to_avoid, mascot ideas, typography prefs, design_usage, avoid lists, premium/playful/etc. via `brand_personality` array, mark type via `logo_type_preferences`, output background via a small new section we'll add to Phase 2).

   One small Phase 2 add: a "Background" radio (white / transparent / dark / mockup-free) and "Output count" (1 vs 4) — saved into `brand_profiles.phase_2_refinement_notes` as JSON to avoid a migration.

## Files to create / edit

Create:
- `src/api/abCreativeEngine.functions.ts` — the 4 server functions above.
- `src/server/abCreativeEngine.server.ts` — Gateway HTTP helpers, brief/prompt system prompts, revision intent map, storage upload helper.
- `src/components/brand-kit/AbCreativeEnginePanel.tsx` — generator + progress UI.
- `src/components/brand-kit/AbDesignGallery.tsx` — grid + lineage.
- `src/components/brand-kit/RevisionRequestPanel.tsx` — modal + quick chips.
- `src/components/brand-kit/BriefPromptDrawer.tsx` — transparency drawer.
- Migration: 3 new tables + storage bucket `ab-designs` (public read).

Edit:
- `src/routes/phase-2.tsx` — swap the premium-render block for `<AbCreativeEnginePanel />` + `<AbDesignGallery />`.
- Leave `src/api/premiumLogoImage.functions.ts` in place (unused) so nothing else breaks; we can delete it in a follow-up once you've confirmed the new flow.

## What's NOT in v1
- No auth, no `user_roles`, no admin route — the gallery + drawer give you everything an admin needs as the only operator. Easy to layer on later.
- No standalone "Brand Intake Form" / "Creative Direction Form" pages — Phase 1 + Phase 2 already are those.
- No `gpt-image-1` (would need your own OpenAI key — happy to add as a follow-up).
- No "Send proof" email — follow-up once we add an email connector.
