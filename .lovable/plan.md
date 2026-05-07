## Goal

Phase 2 currently has the logo generation button tucked inside the `AbCreativeEngine` card at the bottom. The user wants a clearly visible, dedicated **"Generate Logo Design"** section/button so it's obvious where to trigger a render after configuring colors, typography, slogan, elements, mascot, and DNA rules.

## Plan

### 1. New `GenerateLogoSection` block in `src/routes/phase-2.tsx`

Add a prominent, full-width call-to-action section placed right above `AbCreativeEngine` (after the "Save selections / Continue" row). It will:

- Show a heading **"Generate Logo Design"** with a wand icon and a 1-line description: "All your selections above are bundled and sent to the AI renderer."
- Show a compact summary of what will be sent (chips): business name, palette swatches, heading/body fonts, chosen slogan, # of elements, mascot on/off, and "DNA rules: N must-have / N avoid".
- Show a **Background** dropdown (white / transparent / dark / mockup-free) — same options the engine supports.
- A large primary **"Generate Logo Design"** button that triggers the same flow as the engine's generate.
- A disabled state + tooltip when no profile is selected.

### 2. Lift generation into the page (small refactor of `AbCreativeEngine.tsx`)

To make the new top button trigger the engine without duplicating logic:

- Expose an imperative handle from `AbCreativeEngine` via `forwardRef` + `useImperativeHandle` exposing `generate(background)` and `refresh()`.
- The page holds a `ref` and the new section's button calls `engineRef.current?.generate(background)`.
- Inside the engine, hide its own header "Generate Design" button when a `hideHeaderGenerate` prop is passed (so we don't have two buttons doing the same thing). Keep the gallery, revise, brief drawer, progress steps, and approve flow exactly as-is.

### 3. Wiring details

- `background` state moves to `phase-2.tsx` (or stays mirrored) and is passed in.
- The new section uses the same `designDna` and `extras` object already constructed for `AbCreativeEngine`, so what gets generated is identical.
- Toast + progress steps continue to render inside the engine card below.

### 4. No backend / schema changes

Pure UI restructure — no edits to `abCreativeEngine.functions.ts`, no DB migrations, no edge function changes.

## Files touched

- `src/routes/phase-2.tsx` — add `GenerateLogoSection` JSX, lift `background` state, wire ref.
- `src/components/brand-kit/AbCreativeEngine.tsx` — `forwardRef` + `useImperativeHandle`, optional `hideHeaderGenerate` prop.

## Result

The user will see, directly under their selections: a clear card titled **"Generate Logo Design"** with a summary of inputs, a background selector, and one big button. Clicking it kicks off the same two-stage AI render and the result appears in the gallery below.
