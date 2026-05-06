export type FontKey = "inter" | "playfair" | "space" | "dm-serif" | "cormorant" | "mono";

export const FONTS: Record<FontKey, { label: string; family: string; category: string }> = {
  inter: { label: "Inter", family: "'Inter', sans-serif", category: "Sans" },
  space: { label: "Space Grotesk", family: "'Space Grotesk', sans-serif", category: "Sans" },
  playfair: { label: "Playfair Display", family: "'Playfair Display', serif", category: "Serif" },
  "dm-serif": { label: "DM Serif Display", family: "'DM Serif Display', serif", category: "Serif" },
  cormorant: { label: "Cormorant", family: "'Cormorant Garamond', serif", category: "Serif" },
  mono: { label: "JetBrains Mono", family: "'JetBrains Mono', monospace", category: "Mono" },
};

export type IconKey = "none" | "circle" | "square" | "triangle" | "diamond" | "hex" | "spark" | "ring";

export type LogoLayout = "icon-left" | "icon-top" | "wordmark" | "monogram";

export type Palette = {
  name: string;
  colors: string[]; // 5 hex
};

export type BrandState = {
  brandName: string;
  tagline: string;
  initials: string;
  layout: LogoLayout;
  icon: IconKey;
  headingFont: FontKey;
  bodyFont: FontKey;
  letterSpacing: number; // em
  weight: number;
  uppercase: boolean;
  palette: Palette;
  paletteIndex: number; // index of "primary" within palette colors
};