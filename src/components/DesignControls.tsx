import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DESIGN_STYLE_OPTIONS = [
  "Premium Consulting",
  "Modern Corporate",
  "Luxury Professional",
  "Bold Industrial",
  "Elegant Minimal",
  "Local Established Business",
  "High-End Service Brand",
  "Strong Mascot Brand",
  "Clean Typography Brand",
  "Badge / Emblem Brand",
] as const;

export const TYPOGRAPHY_MOOD_OPTIONS = [
  "Elegant Serif",
  "Modern Sans Serif",
  "Luxury Serif",
  "Strong Corporate Sans",
  "Bold Display",
  "Condensed Professional",
  "Refined Monogram",
  "Minimal Geometric",
] as const;

export const ACCENT_DETAIL_OPTIONS = [
  "Red Dot Accent",
  "Thin Underline",
  "Swoosh Accent",
  "Divider Lines",
  "Monogram Highlight",
  "Icon Highlight",
  "Border Accent",
  "No Accent",
] as const;

export const LOGO_COMPOSITION_OPTIONS = [
  "Emblem Above Wordmark",
  "Icon Left of Wordmark",
  "Stacked Centered",
  "Horizontal Professional",
  "Badge Layout",
  "Monogram Above Wordmark",
  "Social Icon First",
] as const;

export const SPACING_STYLE_OPTIONS = [
  "Tight Professional",
  "Balanced Standard",
  "Wide Luxury Spacing",
  "Compact Badge Spacing",
  "Airy Premium Spacing",
] as const;

export const PRODUCTION_PRIORITY_OPTIONS = [
  "Best for Business Cards",
  "Best for Apparel",
  "Best for Signage",
  "Best for Social Media",
  "Best All-Around",
] as const;

export type DesignControlsValue = {
  design_style: (typeof DESIGN_STYLE_OPTIONS)[number];
  typography_mood: (typeof TYPOGRAPHY_MOOD_OPTIONS)[number];
  accent_detail: (typeof ACCENT_DETAIL_OPTIONS)[number];
  logo_composition: (typeof LOGO_COMPOSITION_OPTIONS)[number];
  spacing_style: (typeof SPACING_STYLE_OPTIONS)[number];
  production_priority: (typeof PRODUCTION_PRIORITY_OPTIONS)[number];
};

export const DEFAULT_DESIGN_CONTROLS: DesignControlsValue = {
  design_style: "Premium Consulting",
  typography_mood: "Modern Sans Serif",
  accent_detail: "Red Dot Accent",
  logo_composition: "Icon Left of Wordmark",
  spacing_style: "Balanced Standard",
  production_priority: "Best All-Around",
};

type FieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
};

function Field({ label, value, options, onChange }: FieldProps) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DesignControls({
  value,
  onChange,
}: {
  value: DesignControlsValue;
  onChange: (next: DesignControlsValue) => void;
}) {
  const update = <K extends keyof DesignControlsValue>(
    key: K,
    v: DesignControlsValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Design Controls</CardTitle>
        <p className="text-xs text-muted-foreground">
          Steer the next round of renderings. These choices feed the AI alongside the Design DNA.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Design Style"
          value={value.design_style}
          options={DESIGN_STYLE_OPTIONS}
          onChange={(v) => update("design_style", v as DesignControlsValue["design_style"])}
        />
        <Field
          label="Typography Mood"
          value={value.typography_mood}
          options={TYPOGRAPHY_MOOD_OPTIONS}
          onChange={(v) =>
            update("typography_mood", v as DesignControlsValue["typography_mood"])
          }
        />
        <Field
          label="Accent Detail"
          value={value.accent_detail}
          options={ACCENT_DETAIL_OPTIONS}
          onChange={(v) => update("accent_detail", v as DesignControlsValue["accent_detail"])}
        />
        <Field
          label="Logo Composition"
          value={value.logo_composition}
          options={LOGO_COMPOSITION_OPTIONS}
          onChange={(v) =>
            update("logo_composition", v as DesignControlsValue["logo_composition"])
          }
        />
        <Field
          label="Spacing Style"
          value={value.spacing_style}
          options={SPACING_STYLE_OPTIONS}
          onChange={(v) => update("spacing_style", v as DesignControlsValue["spacing_style"])}
        />
        <Field
          label="Production Priority"
          value={value.production_priority}
          options={PRODUCTION_PRIORITY_OPTIONS}
          onChange={(v) =>
            update("production_priority", v as DesignControlsValue["production_priority"])
          }
        />
      </CardContent>
    </Card>
  );
}