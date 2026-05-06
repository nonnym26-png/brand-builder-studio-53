import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Heart, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { listBrandProfiles, loadBrandProfile } from "@/api/phase2.functions";

export const Route = createFileRoute("/logo-studio")({
  head: () => ({
    meta: [
      { title: "Dynamic Logo Studio — Anaglyph Branding" },
      {
        name: "description",
        content:
          "Phase 2 logo rendering studio. Review concept directions tied to a completed Brand Profile.",
      },
    ],
  }),
  component: LogoStudioPage,
});

type ProfileRow = {
  id: string;
  business_name: string | null;
  client_name: string | null;
  industry: string | null;
  project_status: string | null;
  updated_at: string | null;
};

type ProfileFull = Record<string, unknown> & {
  id?: string;
  business_name?: string | null;
  client_name?: string | null;
  industry?: string | null;
  business_description?: string | null;
  target_customer?: string | null;
  business_differentiator?: string | null;
  brand_personality?: string[] | null;
  brand_feeling?: string | null;
  primary_hex?: string | null;
  secondary_hex?: string | null;
  accent_hex?: string | null;
  neutral_hex?: string | null;
  initials_abbreviation?: string | null;
};

type CardStatus = "neutral" | "favorite" | "selected" | "rejected";

type MockRendering = {
  id: string;
  concept_name: string;
  concept_type: string;
  diamond_score: number;
  strategic_value: string;
  production_value: string;
  why_not_generic: string;
  production_notes: string;
  svg: (palette: Palette, brand: string, initials: string) => string;
};

type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
};

const FALLBACK_PALETTE: Palette = {
  primary: "#0F0F10",
  secondary: "#D6262C",
  accent: "#2BA8E0",
  neutral: "#0F0F10",
};

function safeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return /^#?[0-9a-f]{6}$/i.test(v) ? (v.startsWith("#") ? v : `#${v}`) : fallback;
}

function paletteFromProfile(p: ProfileFull | null): Palette {
  if (!p) return FALLBACK_PALETTE;
  return {
    primary: safeHex(p.primary_hex, FALLBACK_PALETTE.primary),
    secondary: safeHex(p.secondary_hex, FALLBACK_PALETTE.secondary),
    accent: safeHex(p.accent_hex, FALLBACK_PALETTE.accent),
    neutral: safeHex(p.neutral_hex, FALLBACK_PALETTE.neutral),
  };
}

function deriveInitials(name?: string | null, abbreviation?: string | null) {
  if (abbreviation && abbreviation.trim()) return abbreviation.trim().toUpperCase().slice(0, 3);
  const base = (name || "Brand")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return base.slice(0, 3) || "AB";
}

const MOCK_RENDERINGS: MockRendering[] = [
  {
    id: "wordmark",
    concept_name: "The Signature",
    concept_type: "Premium Wordmark",
    diamond_score: 92,
    strategic_value:
      "A confident type-led mark that lets the brand name carry the identity — no decoration required.",
    production_value:
      "Pure type. Reproduces flawlessly across embroidery, signage, foil, engraving, and 1-color print.",
    why_not_generic:
      "Custom letter spacing and proportion replace template fonts. Reads as editorial, not generic.",
    production_notes:
      "Ship as outlined paths in the final vector to lock spacing. Provide one-color and reverse versions.",
    svg: (p, brand) => `
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#FAFAF7"/>
        <text x="600" y="430" text-anchor="middle"
              font-family="'Playfair Display', Georgia, serif"
              font-size="180" font-weight="700"
              letter-spacing="-4" fill="${p.primary}">${brand}</text>
        <line x1="430" y1="500" x2="770" y2="500" stroke="${p.secondary}" stroke-width="4"/>
      </svg>`,
  },
  {
    id: "combination",
    concept_name: "Mark + Wordmark",
    concept_type: "Icon + Wordmark",
    diamond_score: 89,
    strategic_value:
      "A flexible system: lockup for headers, standalone icon for app icons, favicons, and social avatars.",
    production_value:
      "Geometric mark holds shape at 16px and on apparel. Lockup scales cleanly to billboard.",
    why_not_generic:
      "Built from the brand's own geometry — not a stock icon set or random clip art.",
    production_notes:
      "Maintain clear-space equal to the height of the icon on all sides.",
    svg: (p, brand) => `
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#FAFAF7"/>
        <g transform="translate(280 320)">
          <circle cx="80" cy="80" r="80" fill="${p.primary}"/>
          <path d="M40 110 L80 40 L120 110 Z" fill="#FAFAF7"/>
        </g>
        <text x="500" y="430" font-family="Inter, sans-serif"
              font-size="120" font-weight="800"
              letter-spacing="-3" fill="${p.primary}">${brand}</text>
      </svg>`,
  },
  {
    id: "emblem",
    concept_name: "The Emblem",
    concept_type: "Badge / Emblem",
    diamond_score: 87,
    strategic_value:
      "Heritage-style badge — communicates craft, history and trust. Strong on packaging and merch.",
    production_value:
      "Single-color silhouette stitches and screen-prints cleanly with no fine detail loss.",
    why_not_generic:
      "Custom container shape and locked typography replace generic 'shield + initials' badges.",
    production_notes:
      "Provide a simplified version for sub-1-inch use; remove inner ticks for embroidery.",
    svg: (p, _brand, initials) => `
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#FAFAF7"/>
        <g transform="translate(600 400)">
          <path d="M -200 -240 H 200 V 80 L 0 240 L -200 80 Z"
                fill="none" stroke="${p.primary}" stroke-width="10"/>
          <path d="M -160 -200 H 160 V 60 L 0 190 L -160 60 Z"
                fill="none" stroke="${p.primary}" stroke-width="3"/>
          <text x="0" y="20" text-anchor="middle"
                font-family="'Cormorant Garamond', serif"
                font-size="160" font-weight="700"
                letter-spacing="6" fill="${p.primary}">${initials}</text>
        </g>
      </svg>`,
  },
  {
    id: "monogram",
    concept_name: "The Monogram",
    concept_type: "Monogram / Initials",
    diamond_score: 85,
    strategic_value:
      "Initial-driven mark that reads instantly at small scale. Built to live as an avatar and a stamp.",
    production_value:
      "Self-contained geometry — perfect for app icons, favicons, foil-stamping and embroidery.",
    why_not_generic:
      "Bespoke letterforms inside a structured container — not initials inside a default circle.",
    production_notes:
      "Ship square, circular and square-rounded variants for digital surfaces.",
    svg: (p, _brand, initials) => `
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#FAFAF7"/>
        <g transform="translate(600 400)">
          <rect x="-200" y="-200" width="400" height="400" rx="48"
                fill="${p.primary}"/>
          <text x="0" y="60" text-anchor="middle"
                font-family="'Space Grotesk', sans-serif"
                font-size="220" font-weight="700"
                letter-spacing="-6" fill="#FAFAF7">${initials}</text>
        </g>
      </svg>`,
  },
  {
    id: "industry",
    concept_name: "The Industry Symbol",
    concept_type: "Industry Symbol Mark",
    diamond_score: 84,
    strategic_value:
      "A category-relevant symbol that signals what the brand does without resorting to clichés.",
    production_value:
      "Clean silhouette — vector-friendly and one-color ready across print, signage and apparel.",
    why_not_generic:
      "Symbol is built from the brand's own geometry, not a stock industry icon.",
    production_notes:
      "Test at 16px — increase stroke weight if any segment thins below 2px in the final vector.",
    svg: (p, brand) => `
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#FAFAF7"/>
        <g transform="translate(600 320)">
          <path d="M -120 80 L 0 -120 L 120 80 Z"
                fill="none" stroke="${p.primary}" stroke-width="14"
                stroke-linejoin="round"/>
          <circle cx="0" cy="20" r="22" fill="${p.secondary}"/>
        </g>
        <text x="600" y="600" text-anchor="middle"
              font-family="Inter, sans-serif"
              font-size="92" font-weight="700"
              letter-spacing="-2" fill="${p.primary}">${brand}</text>
      </svg>`,
  },
  {
    id: "social",
    concept_name: "Social-Ready Simplified",
    concept_type: "Social Media Mark",
    diamond_score: 90,
    strategic_value:
      "Stripped-down version of the brand mark optimized for avatars, favicons, app icons and stories.",
    production_value:
      "Holds shape at 24px. Works on light and dark feeds without modification.",
    why_not_generic:
      "Same brand DNA as the master lockup — not a re-cropped wordmark.",
    production_notes:
      "Maintain a square safe-area for circular profile crops on all platforms.",
    svg: (p, _brand, initials) => `
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="${p.primary}"/>
        <g transform="translate(600 400)">
          <circle cx="0" cy="0" r="240" fill="none"
                  stroke="#FAFAF7" stroke-width="12"/>
          <text x="0" y="60" text-anchor="middle"
                font-family="Inter, sans-serif"
                font-size="220" font-weight="800"
                letter-spacing="-6" fill="#FAFAF7">${initials}</text>
        </g>
      </svg>`,
  },
];

function LogoStudioPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({});

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    listBrandProfiles()
      .then((rows) => {
        if (cancelled) return;
        setProfiles(rows as ProfileRow[]);
        if (rows.length && !selectedId) setSelectedId((rows[0] as ProfileRow).id);
      })
      .catch((err) => toast.error(err?.message ?? "Failed to load profiles"))
      .finally(() => !cancelled && setLoadingList(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    loadBrandProfile({ data: { id: selectedId } })
      .then((row) => {
        if (cancelled) return;
        setProfile((row as ProfileFull) ?? null);
        setStatuses({});
      })
      .catch((err) => toast.error(err?.message ?? "Failed to load profile"))
      .finally(() => !cancelled && setLoadingProfile(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const palette = paletteFromProfile(profile);
  const brandName = (profile?.business_name as string) || "Your Brand";
  const initials = deriveInitials(brandName, profile?.initials_abbreviation as string | null);

  const setStatus = (id: string, status: CardStatus) => {
    setStatuses((prev) => {
      const next = { ...prev };
      // Only one selected at a time
      if (status === "selected") {
        Object.keys(next).forEach((k) => {
          if (next[k] === "selected") next[k] = "neutral";
        });
      }
      next[id] = prev[id] === status ? "neutral" : status;
      return next;
    });
    if (status === "favorite") toast.success("Added to favorites");
    if (status === "selected") toast.success("Selected as primary direction");
    if (status === "rejected") toast("Marked as rejected");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Home
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-semibold tracking-tight">Dynamic Logo Studio</h1>
            <Badge variant="outline" className="ml-2">Phase 2 · Foundation</Badge>
          </div>
          <div className="w-72">
            <Select value={selectedId} onValueChange={setSelectedId} disabled={loadingList}>
              <SelectTrigger>
                <SelectValue placeholder={loadingList ? "Loading…" : "Select a Brand Profile"} />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.business_name || "Untitled"} {p.client_name ? `· ${p.client_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        <ProfileSummary profile={profile} loading={loadingProfile} palette={palette} />

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Sample Logo Renderings</h2>
              <p className="text-sm text-muted-foreground">
                Mock concepts using the brand's color palette. AI generation, refinement, variations and final
                export will plug in next.
              </p>
            </div>
            <Badge variant="secondary">{MOCK_RENDERINGS.length} concepts</Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {MOCK_RENDERINGS.map((r) => (
              <RenderingCard
                key={r.id}
                rendering={r}
                palette={palette}
                brandName={brandName}
                initials={initials}
                status={statuses[r.id] ?? "neutral"}
                onAction={(s) => setStatus(r.id, s)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileSummary({
  profile,
  loading,
  palette,
}: {
  profile: ProfileFull | null;
  loading: boolean;
  palette: Palette;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading brand profile…
        </CardContent>
      </Card>
    );
  }
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Select a Brand Profile to begin.
        </CardContent>
      </Card>
    );
  }

  const personality = Array.isArray(profile.brand_personality)
    ? (profile.brand_personality as string[])
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">
              {profile.business_name || "Untitled brand"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {[profile.client_name, profile.industry].filter(Boolean).join(" · ") || "Brand profile"}
            </p>
          </div>
          <PaletteSwatch palette={palette} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <SummaryField label="Business Description" value={profile.business_description as string} />
        <SummaryField label="Target Customer" value={profile.target_customer as string} />
        <SummaryField label="Differentiator" value={profile.business_differentiator as string} />
        <SummaryField label="Brand Feeling" value={profile.brand_feeling as string} />
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Brand Personality</p>
          <div className="flex flex-wrap gap-2">
            {personality.length === 0 && (
              <span className="text-sm text-muted-foreground">Not specified</span>
            )}
            {personality.map((w) => (
              <Badge key={w} variant="secondary">{w}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-sm">{value && value.trim() ? value : "Not specified"}</p>
    </div>
  );
}

function PaletteSwatch({ palette }: { palette: Palette }) {
  const swatches: Array<[string, string]> = [
    ["Primary", palette.primary],
    ["Secondary", palette.secondary],
    ["Accent", palette.accent],
    ["Neutral", palette.neutral],
  ];
  return (
    <div className="flex gap-2">
      {swatches.map(([label, hex]) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <div
            className="h-8 w-8 rounded-md border"
            style={{ backgroundColor: hex }}
            aria-label={`${label} ${hex}`}
            title={`${label} ${hex}`}
          />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function RenderingCard({
  rendering,
  palette,
  brandName,
  initials,
  status,
  onAction,
}: {
  rendering: MockRendering;
  palette: Palette;
  brandName: string;
  initials: string;
  status: CardStatus;
  onAction: (s: CardStatus) => void;
}) {
  const svg = rendering.svg(palette, brandName, initials);
  const ringClass =
    status === "selected"
      ? "ring-2 ring-primary"
      : status === "favorite"
        ? "ring-2 ring-rose-400"
        : status === "rejected"
          ? "opacity-60"
          : "";

  return (
    <Card className={`flex flex-col transition ${ringClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{rendering.concept_name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{rendering.concept_type}</p>
          </div>
          <DiamondScore value={rendering.diamond_score} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div
          className="aspect-[3/2] w-full overflow-hidden rounded-md border bg-[#FAFAF7]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="space-y-3 text-sm">
          <Field label="Strategic Value" value={rendering.strategic_value} />
          <Field label="Production Value" value={rendering.production_value} />
          <Field label="Why This Is Not Generic" value={rendering.why_not_generic} />
          <Field label="Production Notes" value={rendering.production_notes} />
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant={status === "favorite" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onAction("favorite")}
          >
            <Heart className="mr-1.5 h-4 w-4" /> Favorite
          </Button>
          <Button
            variant={status === "selected" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onAction("selected")}
          >
            <Check className="mr-1.5 h-4 w-4" /> Select
          </Button>
          <Button
            variant={status === "rejected" ? "destructive" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onAction("rejected")}
          >
            <X className="mr-1.5 h-4 w-4" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm leading-snug">{value}</p>
    </div>
  );
}

function DiamondScore({ value }: { value: number }) {
  const tone =
    value >= 90 ? "bg-emerald-500" : value >= 80 ? "bg-amber-500" : "bg-muted-foreground";
  return (
    <div className="flex flex-col items-center">
      <div className={`h-10 w-10 rotate-45 ${tone} flex items-center justify-center rounded-sm`}>
        <span className="-rotate-45 text-xs font-bold text-white">{value}</span>
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        Diamond
      </span>
    </div>
  );
}
