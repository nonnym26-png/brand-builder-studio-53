# Three-Phase Workflow: Intake → Concepts → Brand Kit

Currently the app has `/` (logo builder), `/phase-2` (concept generator), and `/logo-studio` (rendering). There is no dedicated **Phase 1 intake** page, and **Phase 3 finalization** does not exist. We'll add a clear 3-phase workflow with a persistent top-nav stepper and three buttons that always show where the user is.

## New routes

```
src/routes/
  phase-1.tsx   → /phase-1   (Complete Intake)
  phase-2.tsx   → already exists, will be expanded
  phase-3.tsx   → /phase-3   (Finalize Brand Kit + SVG export)
```

## Shared component: `PhaseStepper`

A new component `src/components/PhaseStepper.tsx` rendered in the header of `/`, `/phase-1`, `/phase-2`, `/phase-3`. Three pill buttons:

- **Phase 1 — Complete Intake** → `/phase-1`
- **Phase 2 — Design Concepts** → `/phase-2`
- **Phase 3 — Finalize Brand Kit** → `/phase-3`

Each button shows a check when its data is complete (intake fields filled, concept selected, kit exported). Active phase is highlighted; uses `Link` with `activeProps`.

Also added to the header on `/` (current Builder) and `/logo-studio` so the user can always see the workflow.

## Phase 1 — `/phase-1` (Complete Intake)

A focused intake form that writes to `brand_profiles`. Reuses `PHASE_2_REQUIRED_FIELDS` from `src/server/profile.shared.ts` to drive the field list and a live "missing fields" checklist. Sections:

- Business basics (name, client, industry, stage, description)
- Audience (target customer, pain points, problem solved, differentiator)
- Brand voice (goals, personality, feeling, words to/not to describe)
- Vision (client vision, inspiration, must-haves, taglines)
- Direction (logo type prefs, color mood, usage, avoidance)

Server function `saveProfile` (new, in `src/api/profile.functions.ts` if not already there) upserts the row and returns the id. A "Continue to Phase 2 →" button is enabled only when `getMissingRequiredFields()` returns empty.

## Phase 2 — `/phase-2` (expanded)

Keeps the existing concept gallery and adds:

1. **Color scheme picker** — explicit grid of curated palettes from `PALETTES` plus manual hex inputs for primary / secondary / accent / neutral (already partially present; will be promoted into a labeled "Color Scheme" panel).
2. **Multi-font selection** — heading + body + accent font dropdowns sourced from `FONTS` (Sans, Serif, Display, Script, Mono groups). Live preview applied to the concept renderings.
3. **Slogan generation** — new server function `generateSlogans` (Lovable AI Gateway, `google/gemini-2.5-flash`, tool-calling) returns 6 tagline candidates from the brand profile. UI: "Generate slogans" button → list with click-to-apply.
4. **Brand elements** — multi-select chips (badge, ribbon, frame, monogram bracket, divider, dot, line, swoosh) feeding into the logo prompt.
5. **Mascots** — toggle + mascot style picker (geometric, line-art, mythological, animal, abstract figure). When enabled, the rendering prompt requests a mascot mark.

The existing AI direction generator and concept cards remain. A "Continue to Phase 3 →" button is enabled once a concept is selected and saved.

## Phase 3 — `/phase-3` (new)

Pulls the selected concept (`selected_logo_concept` on `brand_profiles`) and lets the user finalize the brand kit:

- **Chosen logo** — large preview (light / dark / brand / mono / mark-only)
- **Final palette** — locked from Phase 2, with hex / RGB / CMYK display
- **Final typography** — heading / body / accent samples
- **Brand kit assets** — generated and downloadable:
  - SVG: primary lockup, mark only, wordmark only, stacked, horizontal, black, white, one-color
  - PNG: light + dark renders (via `html-to-image`)
  - PDF: full brand kit (reuses `exportBrandKitPDF`)
  - ZIP bundle: all SVGs + PNGs + PDF in one download (using `jszip`)
- **Save final kit** — writes a `phase_3_completed_at` timestamp + asset manifest JSON to `brand_profiles`.

## Database

Add columns to `brand_profiles` (migration):

```
phase_1_completed_at  timestamptz
phase_2_completed_at  timestamptz
phase_3_completed_at  timestamptz
phase_2_slogans       jsonb
phase_2_elements      jsonb
phase_2_mascot        jsonb
phase_3_assets        jsonb
```

These let `PhaseStepper` show check-marks and let Phase 3 know when the kit is finalized.

## Files added / edited

**Add**
- `src/components/PhaseStepper.tsx`
- `src/routes/phase-1.tsx`
- `src/routes/phase-3.tsx`
- `src/api/slogans.functions.ts` (+ optional shared in `src/server/slogans.server.ts`)
- `src/components/brand-kit/exportBrandKitZip.ts`

**Edit**
- `src/routes/__root.tsx` — no change (stepper lives per-page header, not global), unless we want it globally; we'll keep it per-page for now.
- `src/routes/index.tsx` — replace the lone "Phase 2 →" link with `<PhaseStepper />`.
- `src/routes/phase-2.tsx` — add Color Scheme panel, font triple-picker, slogan generator, elements chips, mascot toggle, Continue button.
- `src/routes/logo-studio.tsx` — render `<PhaseStepper />` in header.
- `src/api/phase2.functions.ts` — add `saveSlogans`, `saveElements`, `saveMascot`, `markPhaseComplete(phase)` helpers.
- `src/components/brand-kit/exportPdf.ts` — small extension to also return the PDF blob (for ZIP).
- `bun add jszip` for ZIP bundling.

## Acceptance

1. Header on `/`, `/phase-1`, `/phase-2`, `/phase-3`, `/logo-studio` shows three connected buttons; current phase highlighted; completed phases show a check.
2. Phase 1 lists all required intake fields, blocks Continue until complete, saves to backend.
3. Phase 2 has clearly labeled Color Scheme, Fonts (3 selectors), Slogans (AI generated), Elements, Mascots panels in addition to the existing concept gallery.
4. Phase 3 displays the chosen concept and offers SVG, PNG, PDF, and ZIP downloads of the full brand kit.
