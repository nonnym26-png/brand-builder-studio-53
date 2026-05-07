import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Sparkles } from "lucide-react";
import { DEFAULT_DESIGN_DNA, type DesignDna } from "@/api/premiumLogoImage.functions";

const STORAGE_KEY = "anaglyph.designDna.v1";

export function useDesignDna(brandKey: string) {
  const key = `${STORAGE_KEY}:${brandKey || "default"}`;
  const [dna, setDna] = useState<DesignDna>(DEFAULT_DESIGN_DNA);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setDna({ ...DEFAULT_DESIGN_DNA, ...JSON.parse(raw) });
      else setDna(DEFAULT_DESIGN_DNA);
    } catch { setDna(DEFAULT_DESIGN_DNA); }
  }, [key]);
  const update = (patch: Partial<DesignDna>) => {
    setDna((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const reset = () => {
    try { localStorage.removeItem(key); } catch {}
    setDna(DEFAULT_DESIGN_DNA);
  };
  return { dna, update, reset };
}

export function DesignDnaRuleEditor({
  dna,
  onChange,
  onReset,
  brandName,
}: {
  dna: DesignDna;
  onChange: (patch: Partial<DesignDna>) => void;
  onReset: () => void;
  brandName?: string;
}) {
  const isCustom = JSON.stringify(dna) !== JSON.stringify(DEFAULT_DESIGN_DNA);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Sparkles className="h-4 w-4 text-primary" /> Design DNA Rules
            {isCustom && <Badge variant="secondary" className="ml-1 text-[10px]">Customized</Badge>}
          </h3>
          <p className="text-xs text-muted-foreground">
            Hard constraints injected into <strong>every</strong> AB Creative Engine render{brandName ? <> for <strong>{brandName}</strong></> : null}. Use semicolon- or middot-separated phrases. Edits autosave locally and apply on the next generation.
          </p>
          <ul className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
            <li><strong>Must have</strong> — non-negotiable visual qualities (e.g. clear readability, balanced composition).</li>
            <li><strong>Avoid</strong> — explicit forbidden treatments (e.g. busy backgrounds, distorted text).</li>
            <li><strong>Quality bar</strong> — the pass/fail threshold the design must clear.</li>
            <li><strong>Formula</strong> — the recipe the AI should follow when composing the mark.</li>
          </ul>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={!isCustom}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Must have" value={dna.mustHave} onChange={(v) => onChange({ mustHave: v })} placeholder="clear readability · balanced composition · …" />
        <Field label="Avoid" value={dna.avoid} onChange={(v) => onChange({ avoid: v })} placeholder="busy backgrounds · thin lines · …" />
        <Field label="Quality bar" value={dna.qualityBar} onChange={(v) => onChange({ qualityBar: v })} placeholder="every metric ≥ 8/10: …" />
        <Field label="Formula" value={dna.formula} onChange={(v) => onChange({ formula: v })} placeholder="strong symbol + clean typography + …" />
      </div>
      <div className="mt-3 rounded-md border border-dashed border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <div className="mb-1 font-semibold uppercase tracking-wide">Live Preview (sent with prompt)</div>
        <div><strong>MUST HAVE:</strong> {dna.mustHave}.</div>
        <div><strong>AVOID:</strong> {dna.avoid}.</div>
        <div><strong>QUALITY BAR:</strong> {dna.qualityBar}.</div>
        <div><strong>FORMULA:</strong> {dna.formula}.</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <Textarea
        className="mt-1 min-h-[72px] text-xs"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}