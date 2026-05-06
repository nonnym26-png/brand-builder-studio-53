export type MarkType =
  | "wordmark"
  | "lettermark"
  | "monogram"
  | "combination"
  | "emblem"
  | "abstract"
  | "mascot";

export type SymbolKey =
  | "none"
  | "leaf"
  | "flame"
  | "wave"
  | "mountain"
  | "bolt"
  | "shield"
  | "key"
  | "tools"
  | "gear"
  | "house"
  | "paw"
  | "wing"
  | "anchor"
  | "compass"
  | "sun"
  | "tree"
  | "wrench"
  | "fork-knife"
  | "scissors"
  | "needle"
  | "molecule"
  | "pulse"
  | "stethoscope"
  | "book"
  | "camera"
  | "code"
  | "rocket"
  | "diamond-cut"
  | "hex-grid"
  | "circuit"
  | "abstract-arc"
  | "abstract-orbit"
  | "abstract-prism";

export type LogoConcept = {
  id: string;
  name: string;            // e.g. "Anchor & Atlas"
  tagline?: string;        // short strategic line
  rationale: string;       // why this concept fits the client
  markType: MarkType;
  symbol: SymbolKey;
  layout: "icon-left" | "icon-top" | "wordmark" | "monogram" | "emblem";
  geometry: "geometric" | "organic" | "editorial" | "industrial" | "playful" | "monolithic";
  cornerStyle: "sharp" | "soft" | "round";
  strokeStyle: "filled" | "outlined" | "duotone";
  initials: string;        // 1-3 letters
  brandName: string;
  containerShape?: "none" | "circle" | "shield" | "badge" | "square";
  headingFont: string;     // CSS font-family
  headingWeight: number;
  letterSpacing: number;   // em
  uppercase: boolean;
  palette: {
    name: string;
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    light: string;
  };
  moodWords: string[];
  usageNotes: string;
};

export type ProfileLite = {
  id?: string;
  business_name?: string | null;
  client_name?: string | null;
  industry?: string | null;
  business_description?: string | null;
  target_customer?: string | null;
  business_differentiator?: string | null;
  client_brand_vision?: string | null;
  brand_personality?: string[] | null;
  brand_feeling?: string | null;
  words_to_describe_brand?: string | null;
  words_not_to_describe_brand?: string | null;
  colors_to_avoid?: string | null;
  symbols_to_avoid?: string | null;
  shapes_to_avoid?: string | null;
  styles_to_avoid?: string | null;
  logo_type_preferences?: string[] | null;
  shape_preferences?: string[] | null;
  font_style_preferences?: string[] | null;
  mascot_symbol_ideas?: string | null;
  industry_symbols_to_consider?: string | null;
  include_initials?: string | null;
  initials_abbreviation?: string | null;
  include_tagline?: string | null;
  tagline_ideas?: string | null;
  primary_hex?: string | null;
  secondary_hex?: string | null;
  accent_hex?: string | null;
  neutral_hex?: string | null;
  color_mood?: string[] | null;
  brand_goals?: string[] | null;
};