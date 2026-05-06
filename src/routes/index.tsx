import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Shuffle, Type, Palette as PaletteIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoMark } from "@/components/brand-kit/LogoMark";
import { FONTS, type BrandState, type FontKey, type IconKey, type LogoLayout } from "@/components/brand-kit/types";
import { PALETTES } from "@/components/brand-kit/palettes";
import { exportBrandKitPDF } from "@/components/brand-kit/exportPdf";

export const Route = createFileRoute("/")({
  component: Index,
});

const ICONS: { key: IconKey; label: string }[] = [
  { key: "none", label: "None" },
  { key: "circle", label: "Circle" },
  { key: "square", label: "Square" },
  { key: "triangle", label: "Triangle" },
  { key: "diamond", label: "Diamond" },
  { key: "hex", label: "Hex" },
  { key: "ring", label: "Ring" },
  { key: "spark", label: "Spark" },
];

const LAYOUTS: { key: LogoLayout; label: string }[] = [
  { key: "icon-left", label: "Icon + Text" },
  { key: "icon-top", label: "Stacked" },
  { key: "wordmark", label: "Wordmark" },
  { key: "monogram", label: "Monogram" },
];

function Index() {
  const [state, setState] = useState<BrandState>({
    brandName: "Aurelia",
    tagline: "Quietly modern, deeply considered.",
    initials: "AU",
    layout: "icon-left",
    icon: "spark",
    headingFont: "playfair",
    bodyFont: "inter",
    letterSpacing: 0,
    weight: 700,
    uppercase: false,
    palette: PALETTES[0],
    paletteIndex: 2,
  });

  const update = <K extends keyof BrandState>(k: K, v: BrandState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const colors = state.palette.colors;
  const dark = colors[0];
  const light = colors[colors.length - 1];
  const primary = colors[state.paletteIndex] ?? colors[2];

  const variants = useMemo(
    () => [
      { bg: light, fg: dark, iconColor: primary, label: "Light" },
      { bg: dark, fg: light, iconColor: primary, label: "Dark" },
      { bg: primary, fg: light, iconColor: light, label: "Brand" },
    ],
    [light, dark, primary],
  );

  const randomize = () => {
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].key;
    const icon = ICONS[Math.floor(Math.random() * (ICONS.length - 1)) + 1].key;
    const fontKeys = Object.keys(FONTS) as FontKey[];
    setState((s) => ({
      ...s,
      palette: p,
      paletteIndex: 2,
      layout,
      icon,
      headingFont: fontKeys[Math.floor(Math.random() * fontKeys.length)],
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <span className="font-serif text-lg font-bold leading-none">AB</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">AB Brand Kit</div>
              <div className="text-xs text-muted-foreground">Logo & Identity Builder</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={randomize}>
              <Shuffle className="mr-2 h-3.5 w-3.5" /> Surprise me
            </Button>
            <Button size="sm" onClick={() => exportBrandKitPDF(state)}>
              <Download className="mr-2 h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        {/* Controls */}
        <aside className="space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Identity
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="brand">Brand name</Label>
                <Input
                  id="brand"
                  value={state.brandName}
                  onChange={(e) => update("brandName", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="tag">Tagline</Label>
                <Input
                  id="tag"
                  value={state.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="init">Monogram initials</Label>
                <Input
                  id="init"
                  maxLength={3}
                  value={state.initials}
                  onChange={(e) => update("initials", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          <Tabs defaultValue="logo">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="logo"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Logo</TabsTrigger>
              <TabsTrigger value="palette"><PaletteIcon className="mr-1.5 h-3.5 w-3.5" />Color</TabsTrigger>
              <TabsTrigger value="type"><Type className="mr-1.5 h-3.5 w-3.5" />Type</TabsTrigger>
            </TabsList>

            <TabsContent value="logo" className="space-y-4 pt-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Layout</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => update("layout", l.key)}
                      className={`rounded-md border px-3 py-2 text-sm transition ${
                        state.layout === l.key
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card hover:border-foreground/40"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Icon</Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {ICONS.map((i) => (
                    <button
                      key={i.key}
                      onClick={() => update("icon", i.key)}
                      title={i.label}
                      className={`flex aspect-square items-center justify-center rounded-md border text-[10px] uppercase transition ${
                        state.icon === i.key
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card hover:border-foreground/40"
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="palette" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => update("palette", p)}
                    className={`flex items-center gap-3 rounded-md border p-2 text-left transition ${
                      state.palette.name === p.name ? "border-foreground" : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <div className="flex h-8 flex-1 overflow-hidden rounded">
                      {p.colors.map((c, i) => (
                        <div key={i} style={{ background: c }} className="flex-1" />
                      ))}
                    </div>
                    <span className="w-16 text-xs font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Brand color
                </Label>
                <div className="mt-2 flex gap-2">
                  {state.palette.colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => update("paletteIndex", i)}
                      className={`h-10 flex-1 rounded-md border-2 transition ${
                        state.paletteIndex === i ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="type" className="space-y-4 pt-4">
              <div>
                <Label>Heading font</Label>
                <Select value={state.headingFont} onValueChange={(v) => update("headingFont", v as FontKey)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FONTS).map(([k, f]) => (
                      <SelectItem key={k} value={k}>
                        <span style={{ fontFamily: f.family }}>{f.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{f.category}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body font</Label>
                <Select value={state.bodyFont} onValueChange={(v) => update("bodyFont", v as FontKey)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FONTS).map(([k, f]) => (
                      <SelectItem key={k} value={k}>
                        <span style={{ fontFamily: f.family }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Weight</Label>
                  <span className="text-xs text-muted-foreground">{state.weight}</span>
                </div>
                <Slider
                  value={[state.weight]}
                  min={300}
                  max={900}
                  step={100}
                  onValueChange={([v]) => update("weight", v)}
                  className="mt-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Letter spacing</Label>
                  <span className="text-xs text-muted-foreground">{state.letterSpacing.toFixed(2)}em</span>
                </div>
                <Slider
                  value={[state.letterSpacing * 100]}
                  min={-5}
                  max={30}
                  step={1}
                  onValueChange={([v]) => update("letterSpacing", v / 100)}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="upper" className="cursor-pointer">Uppercase</Label>
                <Switch id="upper" checked={state.uppercase} onCheckedChange={(v) => update("uppercase", v)} />
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Canvas */}
        <section className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-10">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Primary mark</span>
              <span className="font-mono text-xs text-muted-foreground">{state.palette.name.toUpperCase()}</span>
            </div>
            <div className="flex min-h-[280px] items-center justify-center">
              <LogoMark state={state} bg={light} fg={dark} iconColor={primary} size="lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {variants.map((v) => (
              <div key={v.label} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{v.label}</div>
                <div className="flex min-h-[140px] items-center justify-center">
                  <LogoMark state={state} bg={v.bg} fg={v.fg} iconColor={v.iconColor} size="md" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Palette</div>
              <div className="flex h-32 overflow-hidden rounded-md">
                {colors.map((c, i) => (
                  <div key={i} style={{ background: c }} className="flex-1" />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {colors.map((c, i) => (
                  <div key={i} className="font-mono text-[10px] uppercase text-muted-foreground">
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Typography</div>
              <div className="space-y-2">
                <div
                  style={{ fontFamily: FONTS[state.headingFont].family, fontWeight: state.weight }}
                  className="text-4xl leading-none"
                >
                  Aa
                </div>
                <div className="text-xs text-muted-foreground">
                  Heading — {FONTS[state.headingFont].label}
                </div>
                <div className="pt-2" style={{ fontFamily: FONTS[state.bodyFont].family }}>
                  The quick brown fox jumps over the lazy dog.
                </div>
                <div className="text-xs text-muted-foreground">
                  Body — {FONTS[state.bodyFont].label}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        AB Brand Kit · Build, refine, and export your identity in minutes.
      </footer>
    </div>
  );
}
