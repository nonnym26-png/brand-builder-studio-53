import { Symbol } from "./symbols";
import type { LogoConcept } from "./conceptTypes";

function ContainerPath({ shape, color, stroke }: { shape: NonNullable<LogoConcept["containerShape"]>; color: string; stroke: boolean }) {
  const fill = stroke ? "none" : color;
  const sw = stroke ? 6 : 0;
  switch (shape) {
    case "circle":
      return <circle cx="100" cy="100" r="92" fill={fill} stroke={color} strokeWidth={sw} />;
    case "square":
      return <rect x="10" y="10" width="180" height="180" rx="14" fill={fill} stroke={color} strokeWidth={sw} />;
    case "shield":
      return <path d="M100 8 L 188 36 L 178 122 C 170 162, 138 184, 100 192 C 62 184, 30 162, 22 122 L 12 36 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
    case "badge":
      return <path d="M30 20 L 170 20 Q 188 20 188 38 L 188 162 Q 188 180 170 180 L 110 180 L 100 196 L 90 180 L 30 180 Q 12 180 12 162 L 12 38 Q 12 20 30 20 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
    default:
      return null;
  }
}

/** Render a concept lockup at any scale. `bg` controls background, `mode` switches color scheme. */
export function ConceptMark({
  concept,
  mode = "light",
  size = 320,
  showName = true,
}: {
  concept: LogoConcept;
  mode?: "light" | "dark" | "mono" | "brand" | "white";
  size?: number;
  showName?: boolean;
}) {
  const { palette } = concept;
  let bg = palette.light;
  let fg = palette.dark;
  let mark = palette.primary;
  let accent = palette.accent;

  if (mode === "dark") { bg = palette.dark; fg = palette.light; mark = palette.primary; accent = palette.secondary; }
  if (mode === "brand") { bg = palette.primary; fg = palette.light; mark = palette.light; accent = palette.accent; }
  if (mode === "mono") { bg = palette.light; fg = palette.dark; mark = palette.dark; accent = palette.dark; }
  if (mode === "white") { bg = palette.dark; fg = palette.light; mark = palette.light; accent = palette.light; }

  const stroke = concept.strokeStyle === "outlined";
  const duotone = concept.strokeStyle === "duotone" && mode !== "mono";

  const display = concept.uppercase ? concept.brandName.toUpperCase() : concept.brandName;
  const initials = (concept.initials || concept.brandName.slice(0, 2)).toUpperCase();

  // ===== Layouts =====
  if (concept.markType === "wordmark") {
    return (
      <div style={{ background: bg, padding: size * 0.12, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <span style={{ fontFamily: concept.headingFont, fontWeight: concept.headingWeight, color: fg, fontSize: size * 0.18, letterSpacing: `${concept.letterSpacing}em`, lineHeight: 1 }}>
          {display}
        </span>
      </div>
    );
  }

  if (concept.markType === "lettermark" || concept.markType === "monogram") {
    const boxSize = size * 0.5;
    return (
      <div style={{ background: bg, padding: size * 0.1, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.06, width: "100%" }}>
        <svg width={boxSize} height={boxSize} viewBox="0 0 200 200">
          {concept.containerShape && concept.containerShape !== "none" && (
            <ContainerPath shape={concept.containerShape} color={mark} stroke={stroke} />
          )}
          <text
            x="100"
            y="100"
            textAnchor="middle"
            dominantBaseline="central"
            fill={duotone ? accent : (concept.containerShape && concept.containerShape !== "none" && !stroke ? bg : mark)}
            style={{ fontFamily: concept.headingFont, fontWeight: 800, fontSize: 110, letterSpacing: -2 }}
          >
            {initials}
          </text>
        </svg>
        {showName && (
          <span style={{ fontFamily: concept.headingFont, fontWeight: concept.headingWeight, color: fg, fontSize: size * 0.085, letterSpacing: `${Math.max(concept.letterSpacing, 0.05)}em` }}>
            {display}
          </span>
        )}
      </div>
    );
  }

  if (concept.markType === "emblem") {
    const boxSize = size * 0.7;
    return (
      <div style={{ background: bg, padding: size * 0.08, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <svg width={boxSize} height={boxSize} viewBox="0 0 200 200">
          <ContainerPath shape={concept.containerShape && concept.containerShape !== "none" ? concept.containerShape : "shield"} color={mark} stroke={stroke} />
          <g transform="translate(60 40) scale(0.8)">
            <Symbol symbol={concept.symbol} color={duotone ? accent : (stroke ? mark : bg)} accent={accent} stroke={stroke} duotone={duotone} />
          </g>
          <text x="100" y="160" textAnchor="middle" fill={stroke ? mark : bg} style={{ fontFamily: concept.headingFont, fontWeight: concept.headingWeight, fontSize: 18, letterSpacing: 4 }}>
            {display.toUpperCase()}
          </text>
        </svg>
      </div>
    );
  }

  // combination, abstract, mascot
  const isStacked = concept.layout === "icon-top";
  const iconSize = size * (isStacked ? 0.4 : 0.32);

  return (
    <div
      style={{
        background: bg,
        padding: size * 0.1,
        borderRadius: 16,
        display: "flex",
        flexDirection: isStacked ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: size * (isStacked ? 0.05 : 0.06),
        width: "100%",
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
        <Symbol symbol={concept.symbol} color={mark} accent={accent} stroke={stroke} duotone={duotone} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", alignItems: isStacked ? "center" : "flex-start", gap: 4 }}>
        <span style={{ fontFamily: concept.headingFont, fontWeight: concept.headingWeight, color: fg, fontSize: size * 0.13, letterSpacing: `${concept.letterSpacing}em`, lineHeight: 1 }}>
          {display}
        </span>
        {concept.tagline && (
          <span style={{ fontFamily: concept.headingFont, fontWeight: 400, color: fg, opacity: 0.65, fontSize: size * 0.04, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {concept.tagline}
          </span>
        )}
      </div>
    </div>
  );
}