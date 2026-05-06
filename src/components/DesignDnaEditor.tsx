import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DESIGN_DNA_FIELDS,
  loadDesignDnaRecord,
  saveDesignDnaRecord,
  runDesignDnaPrompt,
} from "@/api/designDna.functions";

type Values = Partial<Record<(typeof DESIGN_DNA_FIELDS)[number], string>>;

const FIELD_META: Record<
  (typeof DESIGN_DNA_FIELDS)[number],
  { label: string; multiline?: boolean; placeholder?: string }
> = {
  design_style: { label: "Design Style", placeholder: "e.g. Refined consulting, premium minimal" },
  brand_personality_summary: { label: "Brand Personality Summary", multiline: true },
  visual_tone: { label: "Visual Tone", placeholder: "Calm, confident, sharp" },
  typography_direction: { label: "Typography Direction", multiline: true },
  primary_font_style: { label: "Primary Font Style", placeholder: "Modern serif / Geometric sans" },
  secondary_font_style: { label: "Secondary Font Style" },
  letter_spacing_style: { label: "Letter Spacing Style", placeholder: "Tight / Normal / Wide tracking" },
  monogram_direction: { label: "Monogram Direction", multiline: true },
  symbol_direction: { label: "Symbol Direction", multiline: true },
  shape_language: { label: "Shape Language", multiline: true },
  line_style: { label: "Line Style", placeholder: "Hairline / Medium / Bold" },
  spacing_rules: { label: "Spacing Rules", multiline: true },
  color_hierarchy: { label: "Color Hierarchy", multiline: true },
  accent_color_usage: { label: "Accent Color Usage", multiline: true },
  layout_system: { label: "Layout System", multiline: true },
  composition_notes: { label: "Composition Notes", multiline: true },
  premium_design_rules: { label: "Premium Design Rules", multiline: true },
  production_rules: { label: "Production Rules", multiline: true },
  social_media_rules: { label: "Social Media Rules", multiline: true },
  logo_variation_rules: { label: "Logo Variation Rules", multiline: true },
  avoidance_rules: { label: "Avoidance Rules", multiline: true },
  designer_notes: { label: "Designer Notes", multiline: true },
};

export function DesignDnaEditor({ brandProfileId }: { brandProfileId: string | null }) {
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!brandProfileId) {
      setValues({});
      setUpdatedAt(null);
      return;
    }
    setLoading(true);
    loadDesignDnaRecord({ data: { brand_profile_id: brandProfileId } })
      .then(({ record }) => {
        const next: Values = {};
        if (record) {
          for (const k of DESIGN_DNA_FIELDS) {
            const v = (record as Record<string, unknown>)[k];
            if (typeof v === "string") next[k] = v;
          }
          setUpdatedAt(record.updated_at ?? null);
        } else {
          setUpdatedAt(null);
        }
        setValues(next);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load Design DNA"))
      .finally(() => setLoading(false));
  }, [brandProfileId]);

  const update = (key: (typeof DESIGN_DNA_FIELDS)[number], v: string) =>
    setValues((s) => ({ ...s, [key]: v }));

  const save = async () => {
    if (!brandProfileId) {
      toast.error("Select a Brand Profile first");
      return;
    }
    setSaving(true);
    try {
      const { record } = await saveDesignDnaRecord({
        data: { brand_profile_id: brandProfileId, values },
      });
      setUpdatedAt(record.updated_at ?? null);
      toast.success("Design DNA saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!brandProfileId) {
      toast.error("Select a Brand Profile first");
      return;
    }
    setGenerating(true);
    try {
      const { record } = await runDesignDnaPrompt({
        data: { brand_profile_id: brandProfileId },
      });
      const next: Values = {};
      for (const k of DESIGN_DNA_FIELDS) {
        const v = (record as Record<string, unknown>)[k];
        if (typeof v === "string") next[k] = v;
      }
      setValues(next);
      setUpdatedAt(record.updated_at ?? null);
      toast.success("Design DNA generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!brandProfileId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Select a Brand Profile to edit its Design DNA.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Design DNA Editor</h3>
          <p className="text-xs text-muted-foreground">
            {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={generate} disabled={generating || loading || saving}>
            {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Generate with AI
          </Button>
          <Button size="sm" onClick={save} disabled={saving || loading || generating}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save Design DNA
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DESIGN_DNA_FIELDS.map((key) => {
            const meta = FIELD_META[key];
            const val = values[key] ?? "";
            return (
              <div key={key} className={meta.multiline ? "md:col-span-2" : ""}>
                <Label htmlFor={`dna-${key}`}>{meta.label}</Label>
                {meta.multiline ? (
                  <Textarea
                    id={`dna-${key}`}
                    rows={3}
                    className="mt-1.5"
                    placeholder={meta.placeholder}
                    value={val}
                    onChange={(e) => update(key, e.target.value)}
                  />
                ) : (
                  <Input
                    id={`dna-${key}`}
                    className="mt-1.5"
                    placeholder={meta.placeholder}
                    value={val}
                    onChange={(e) => update(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}