export type FontKey =
  | "inter"
  | "space"
  | "montserrat"
  | "poppins"
  | "work-sans"
  | "playfair"
  | "dm-serif"
  | "cormorant"
  | "lora"
  | "merriweather"
  | "oswald"
  | "bebas"
  | "archivo-black"
  | "anton"
  | "pacifico"
  | "dancing-script"
  | "great-vibes"
  | "allura"
  | "mono";

export const FONTS: Record<FontKey, { label: string; family: string; category: string }> = {
  // Sans Serif
  inter: { label: "Inter", family: "'Inter', sans-serif", category: "Sans Serif" },
  space: { label: "Space Grotesk", family: "'Space Grotesk', sans-serif", category: "Sans Serif" },
  montserrat: { label: "Montserrat", family: "'Montserrat', sans-serif", category: "Sans Serif" },
  poppins: { label: "Poppins", family: "'Poppins', sans-serif", category: "Sans Serif" },
  "work-sans": { label: "Work Sans", family: "'Work Sans', sans-serif", category: "Sans Serif" },
  // Serif
  playfair: { label: "Playfair Display", family: "'Playfair Display', serif", category: "Serif" },
  "dm-serif": { label: "DM Serif Display", family: "'DM Serif Display', serif", category: "Serif" },
  cormorant: { label: "Cormorant", family: "'Cormorant Garamond', serif", category: "Serif" },
  lora: { label: "Lora", family: "'Lora', serif", category: "Serif" },
  merriweather: { label: "Merriweather", family: "'Merriweather', serif", category: "Serif" },
  // Bold / Display
  oswald: { label: "Oswald", family: "'Oswald', sans-serif", category: "Bold" },
  bebas: { label: "Bebas Neue", family: "'Bebas Neue', sans-serif", category: "Bold" },
  "archivo-black": { label: "Archivo Black", family: "'Archivo Black', sans-serif", category: "Bold" },
  anton: { label: "Anton", family: "'Anton', sans-serif", category: "Bold" },
  // Script
  pacifico: { label: "Pacifico", family: "'Pacifico', cursive", category: "Script" },
  "dancing-script": { label: "Dancing Script", family: "'Dancing Script', cursive", category: "Script" },
  "great-vibes": { label: "Great Vibes", family: "'Great Vibes', cursive", category: "Script" },
  allura: { label: "Allura", family: "'Allura', cursive", category: "Script" },
  // Mono
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