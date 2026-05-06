import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { DesignDna } from "@/server/designDna.server";

export function DesignDnaPanel({
  dna,
  generatedAt,
  loading,
  onGenerate,
  hasProfile,
}: {
  dna: DesignDna | null;
  generatedAt: string | null;
  loading: boolean;
  onGenerate: () => void;
  hasProfile: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AB Design DNA Engine</CardTitle>
            <Badge variant="outline" className="ml-1">Creative direction</Badge>
          </div>
          <div className="flex items-center gap-2">
            {generatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {new Date(generatedAt).toLocaleString()}
              </span>
            )}
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={!hasProfile || loading}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {dna ? "Regenerate" : "Generate Design DNA"}
            </Button>
            {dna && (
              <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!dna && (
        <CardContent className="text-sm text-muted-foreground">
          The Design DNA Engine analyzes the Brand Profile to set typography, monogram, shape, color
          hierarchy, layout, production rules, and social adaptability before any logo is rendered.
          Generate it once per profile, then refine and re-generate as the profile evolves.
        </CardContent>
      )}

      {dna && open && (
        <CardContent className="space-y-6">
          <NorthStar value={dna.ab_north_star} />

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="1. Brand Personality">
              <KV label="Archetype" value={dna.brand_personality_direction.archetype} />
              <KV label="Tone" value={dna.brand_personality_direction.tone} />
              <Chips label="Keywords" items={dna.brand_personality_direction.keywords} />
              <Bullets label="Do" items={dna.brand_personality_direction.do} tone="positive" />
              <Bullets label="Avoid" items={dna.brand_personality_direction.avoid} tone="negative" />
            </Section>

            <Section title="2. Typography">
              <KV label="Primary" value={dna.typography_direction.primary_typeface} />
              <Chips label="Alternatives" items={dna.typography_direction.primary_typeface_alternatives} />
              <KV label="Secondary" value={dna.typography_direction.secondary_typeface} />
              <KV label="Weight" value={dna.typography_direction.weight_strategy} />
              <KV label="Letter Spacing" value={dna.typography_direction.letter_spacing} />
              <KV label="Case" value={dna.typography_direction.case_strategy} />
              <KV label="Descriptor" value={dna.typography_direction.descriptor_style} />
            </Section>

            <Section title="3. Monogram / Symbol">
              <KV label="Initials" value={dna.monogram_symbol_direction.initials} />
              <KV label="Container" value={dna.monogram_symbol_direction.container_shape} />
              <KV label="Construction" value={dna.monogram_symbol_direction.construction_notes} />
              <Chips label="Motifs" items={dna.monogram_symbol_direction.symbol_motifs} />
              <Bullets
                label="Avoid"
                items={dna.monogram_symbol_direction.symbols_to_avoid}
                tone="negative"
              />
            </Section>

            <Section title="4. Shape Language">
              <KV label="Geometry" value={dna.shape_language.geometry} />
              <KV label="Corners" value={dna.shape_language.corner_treatment} />
              <KV label="Strokes" value={dna.shape_language.stroke_strategy} />
              <KV label="Grid" value={dna.shape_language.composition_grid} />
              <Bullets label="Avoid" items={dna.shape_language.avoid} tone="negative" />
            </Section>

            <Section title="5. Color Hierarchy">
              <ColorRow label="Foundation" swatch={dna.color_hierarchy.foundation} />
              <ColorRow label="Secondary" swatch={dna.color_hierarchy.secondary} />
              <ColorRow label="Accent" swatch={dna.color_hierarchy.accent} />
              <ColorRow label="Neutral" swatch={dna.color_hierarchy.neutral} />
              <Bullets label="Usage Rules" items={dna.color_hierarchy.usage_rules} />
              <KV label="Accent Rule" value={dna.color_hierarchy.accent_rule} />
            </Section>

            <Section title="6. Layout Composition">
              <KV label="Primary Lockup" value={dna.layout_composition.primary_lockup} />
              <Bullets label="Secondary Lockups" items={dna.layout_composition.secondary_lockups} />
              <KV label="Spacing" value={dna.layout_composition.spacing_system} />
              <KV label="Clear Space" value={dna.layout_composition.clear_space} />
              <KV label="Optical Alignment" value={dna.layout_composition.optical_alignment} />
            </Section>

            <Section title="7. Visual Hierarchy">
              <KV label="Focal Point" value={dna.visual_hierarchy.focal_point} />
              <Bullets label="Reading Order" items={dna.visual_hierarchy.reading_order} />
              <KV label="Contrast" value={dna.visual_hierarchy.contrast_strategy} />
            </Section>

            <Section title="8. Production Rules">
              <Bullets label="Must" items={dna.production_rules.must} tone="positive" />
              <Bullets label="Must Not" items={dna.production_rules.must_not} tone="negative" />
              <KV label="Minimum Size" value={dna.production_rules.minimum_size} />
              <KV label="One-Color" value={dna.production_rules.one_color_strategy} />
              <KV label="Embroidery" value={dna.production_rules.embroidery_strategy} />
            </Section>

            <Section title="9. Social Media Adaptability">
              <KV label="Avatar" value={dna.social_media_adaptability.avatar_strategy} />
              <KV label="Favicon" value={dna.social_media_adaptability.favicon_strategy} />
              <KV label="Safe Area" value={dna.social_media_adaptability.safe_area} />
              <KV label="Light/Dark" value={dna.social_media_adaptability.light_dark_behavior} />
            </Section>

            <Section title="10. Brand Kit Readiness">
              <Chips label="Required Versions" items={dna.brand_kit_readiness.required_versions} />
              <Chips label="Required Formats" items={dna.brand_kit_readiness.required_formats} />
              <Bullets label="Deliverable Notes" items={dna.brand_kit_readiness.deliverable_notes} />
            </Section>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function NorthStar({ value }: { value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">AB North Star</p>
      <p className="text-sm leading-snug">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm leading-snug">{value}</p>
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Badge key={it} variant="secondary" className="font-normal">{it}</Badge>
        ))}
      </div>
    </div>
  );
}

function Bullets({
  label,
  items,
  tone = "neutral",
}: {
  label: string;
  items: string[];
  tone?: "neutral" | "positive" | "negative";
}) {
  if (!items?.length) return null;
  const dot =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "negative"
        ? "bg-destructive"
        : "bg-muted-foreground/50";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={`${i}-${it}`} className="flex items-start gap-2 text-sm leading-snug">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColorRow({
  label,
  swatch,
}: {
  label: string;
  swatch: { name: string; hex: string };
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 rounded-md border shrink-0"
        style={{ backgroundColor: swatch.hex }}
        aria-label={`${label} ${swatch.hex}`}
        title={`${label} ${swatch.hex}`}
      />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm leading-snug truncate">
          {swatch.name} <span className="text-muted-foreground">{swatch.hex}</span>
        </p>
      </div>
    </div>
  );
}