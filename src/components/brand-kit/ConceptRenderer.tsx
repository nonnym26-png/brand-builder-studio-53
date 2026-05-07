import { Symbol } from "./symbols";
import type { LogoConcept } from "./conceptTypes";

type Mode = "light" | "dark" | "mono" | "brand" | "white";

function resolveColors(concept: LogoConcept, mode: Mode) {
  const { palette } = concept;
  let bg = palette.light;
  let fg = palette.dark;
  let mark = palette.primary;
  let accent = palette.accent;
  let rule = palette.dark;

  if (mode === "dark")  { bg = palette.dark;     fg = palette.light; mark = palette.light;   accent = palette.accent;    rule = palette.light; }
  if (mode === "brand") { bg = palette.primary;  fg = palette.light; mark = palette.light;   accent = palette.accent;    rule = palette.light; }
  if (mode === "mono")  { bg = palette.light;    fg = palette.dark;  mark = palette.dark;    accent = palette.dark;      rule = palette.dark; }
  if (mode === "white") { bg = palette.dark;     fg = palette.light; mark = palette.light;   accent = palette.light;     rule = palette.light; }

  return { bg, fg, mark, accent, rule };
}

/** Container shapes drawn into a 200x200 viewBox. */
function ContainerPath({
  shape,
  color,
  stroke,
  strokeWidth = 4,
}: {
  shape: NonNullable<LogoConcept["containerShape"]>;
  color: string;
  stroke: boolean;
  strokeWidth?: number;
}) {
  const fill = stroke ? "none" : color;
  const sw = stroke ? strokeWidth : 0;
  switch (shape) {
    case "circle":
      return <circle cx="100" cy="100" r="94" fill={fill} stroke={color} strokeWidth={sw} />;
    case "square":
      return <rect x="6" y="6" width="188" height="188" rx="10" fill={fill} stroke={color} strokeWidth={sw} />;
    case "shield":
      return (
        <path
          d="M100 6 L 190 32 L 182 118 C 176 162, 144 188, 100 196 C 56 188, 24 162, 18 118 L 10 32 Z"
          fill={fill}
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case "badge":
      return (
        <path
          d="M28 16 L 172 16 Q 188 16 188 32 L 188 152 Q 188 168 172 168 L 116 168 L 100 192 L 84 168 L 28 168 Q 12 168 12 152 L 12 32 Q 12 16 28 16 Z"
          fill={fill}
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

/** Curved upper / lower text along a circle, used inside emblems. */
function CircularText({
  text,
  radius,
  color,
  fontFamily,
  fontSize,
  letterSpacing,
  fontWeight,
  position = "top",
}: {
  text: string;
  radius: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
  position?: "top" | "bottom";
}) {
  const id = `arc-${position}-${Math.round(radius)}`;
  const path =
    position === "top"
      ? `M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`
      : `M ${100 - radius} 100 A ${radius} ${radius} 0 0 0 ${100 + radius} 100`;
  return (
    <g>
      <defs>
        <path id={id} d={path} fill="none" />
      </defs>
      <text
        fill={color}
        style={{ fontFamily, fontSize, fontWeight, letterSpacing: `${letterSpacing}em` }}
      >
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {text.toUpperCase()}
        </textPath>
      </text>
    </g>
  );
}

/** Hairline divider used in icon-left lockups. */
function VerticalRule({ color, height }: { color: string; height: number }) {
  return <span style={{ display: "inline-block", width: 1, height, background: color, opacity: 0.3 }} />;
}

export function ConceptMark({
  concept,
  mode = "light",
  size = 320,
  showName = true,
}: {
  concept: LogoConcept;
  mode?: Mode;
  size?: number;
  showName?: boolean;
}) {
  const { bg, fg, mark, accent, rule } = resolveColors(concept, mode);
  const stroke = concept.strokeStyle === "outlined";
  const duotone = concept.strokeStyle === "duotone" && mode !== "mono";

  const display = concept.uppercase ? concept.brandName.toUpperCase() : concept.brandName;
  const initials = (concept.initials || concept.brandName.slice(0, 2)).toUpperCase();

  // Shared frame
  const frame = {
    background: bg,
    padding: size * 0.14,
    borderRadius: 4,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  // ===== WORDMARK — pure typographic, with hairline rules and a tiny established mark =====
  if (concept.markType === "wordmark") {
    return (
      <div style={{ ...frame, display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.045 }}>
        <div style={{ width: "100%", height: 1, background: rule, opacity: 0.25 }} />
        <span
          style={{
            fontFamily: concept.headingFont,
            fontWeight: concept.headingWeight,
            color: fg,
            fontSize: size * 0.2,
            letterSpacing: `${concept.letterSpacing}em`,
            lineHeight: 1,
          }}
        >
          {display}
        </span>
        {concept.tagline && (
          <span
            style={{
              fontFamily: concept.subFont,
              fontWeight: concept.subWeight,
              color: fg,
              opacity: 0.7,
              fontSize: size * 0.038,
              letterSpacing: `${concept.subLetterSpacing}em`,
              textTransform: "uppercase",
            }}
          >
            {concept.tagline}
          </span>
        )}
        <div style={{ width: "100%", height: 1, background: rule, opacity: 0.25 }} />
      </div>
    );
  }

  // ===== MONOGRAM / LETTERMARK — custom interlocked initials in a refined container =====
  if (concept.markType === "lettermark" || concept.markType === "monogram") {
    const boxSize = size * 0.58;
    const container = concept.containerShape && concept.containerShape !== "none" ? concept.containerShape : "circle";
    const onContainerColor = stroke ? mark : bg;
    const letters = initials.slice(0, 2).split("");
    // Tuned font sizes so glyphs sit comfortably inside the 200x200 viewBox
    const oneFs = 96;
    const twoFs = 86;
    return (
      <div style={{ ...frame, display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.07 }}>
        <svg width={boxSize} height={boxSize} viewBox="0 0 200 200">
          <ContainerPath shape={container} color={mark} stroke={stroke} strokeWidth={3} />
          {/* Hairline inner ring (circles only) for refined depth */}
          {container === "circle" && (
            <circle cx="100" cy="100" r="86" fill="none" stroke={onContainerColor} strokeWidth="1" opacity="0.4" />
          )}
          {/* Initials — optically centered (no overflowing divider) */}
          {letters.length === 1 ? (
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="central"
              fill={duotone ? accent : onContainerColor}
              style={{ fontFamily: concept.headingFont, fontWeight: 800, fontSize: oneFs, letterSpacing: "-0.02em" }}
            >
              {letters[0]}
            </text>
          ) : (
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="central"
              fill={onContainerColor}
              style={{ fontFamily: concept.headingFont, fontWeight: 800, fontSize: twoFs, letterSpacing: "-0.06em" }}
            >
              <tspan fill={onContainerColor}>{letters[0]}</tspan>
              <tspan fill={duotone ? accent : onContainerColor}>{letters[1]}</tspan>
            </text>
          )}
          {/* Subtle accent dot under monogram for editorial polish */}
          <circle cx="100" cy="160" r="2" fill={duotone ? accent : onContainerColor} opacity="0.7" />
        </svg>
        {showName && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.018 }}>
            <span
              style={{
                fontFamily: concept.headingFont,
                fontWeight: concept.headingWeight,
                color: fg,
                fontSize: size * 0.1,
                letterSpacing: `${Math.max(concept.letterSpacing, 0.04)}em`,
                lineHeight: 1,
              }}
            >
              {display}
            </span>
            {concept.tagline && (
              <span
                style={{
                  fontFamily: concept.subFont,
                  fontWeight: concept.subWeight,
                  color: fg,
                  opacity: 0.65,
                  fontSize: size * 0.034,
                  letterSpacing: `${concept.subLetterSpacing}em`,
                  textTransform: "uppercase",
                }}
              >
                {concept.tagline}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== EMBLEM — heritage badge with curved type and structured composition =====
  if (concept.markType === "emblem") {
    const boxSize = size * 0.85;
    const container = concept.containerShape && concept.containerShape !== "none" ? concept.containerShape : "shield";
    const isCircle = container === "circle";
    const onContainerColor = stroke ? mark : bg;
    const symbolBoxColor = duotone ? accent : onContainerColor;
    const topText = display.toUpperCase();
    const bottomText = (concept.tagline || "EST.").toUpperCase();
    return (
      <div style={{ ...frame, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={boxSize} height={boxSize} viewBox="0 0 200 200">
          <ContainerPath shape={container} color={mark} stroke={stroke} strokeWidth={4} />
          {/* Inner hairline frame */}
          {isCircle ? (
            <circle cx="100" cy="100" r="84" fill="none" stroke={onContainerColor} strokeWidth="1" opacity="0.45" />
          ) : (
            <path
              d="M100 18 L 174 42 L 168 116 C 162 152, 136 174, 100 182 C 64 174, 38 152, 32 116 L 26 42 Z"
              fill="none"
              stroke={onContainerColor}
              strokeWidth="1"
              opacity="0.45"
            />
          )}
          {/* Curved top wordmark on circles, straight on shields */}
          {isCircle && (
            <CircularText
              text={topText}
              radius={66}
              color={onContainerColor}
              fontFamily={concept.headingFont}
              fontSize={11}
              fontWeight={concept.headingWeight}
              letterSpacing={0.18}
              position="top"
            />
          )}
          {!isCircle && (
            <text
              x="100"
              y="48"
              textAnchor="middle"
              fill={onContainerColor}
              style={{ fontFamily: concept.headingFont, fontSize: 11, fontWeight: concept.headingWeight, letterSpacing: "0.22em" }}
            >
              {topText}
            </text>
          )}
          {/* Central symbol — properly sized & centered */}
          <g transform="translate(70 78) scale(0.6)">
            <Symbol symbol={concept.symbol} color={symbolBoxColor} accent={accent} stroke={stroke} duotone={duotone} />
          </g>
          {/* Divider band — ticks + center dot, sits ABOVE the bottom label */}
          <g opacity="0.7">
            <line x1="56" y1="148" x2="86" y2="148" stroke={onContainerColor} strokeWidth="1" />
            <line x1="114" y1="148" x2="144" y2="148" stroke={onContainerColor} strokeWidth="1" />
            <circle cx="100" cy="148" r="1.5" fill={onContainerColor} />
          </g>
          {/* Bottom label — curved on circles (no straight overlap), straight on shields */}
          {isCircle ? (
            <CircularText
              text={bottomText.slice(0, 28)}
              radius={74}
              color={onContainerColor}
              fontFamily={concept.subFont}
              fontSize={8}
              fontWeight={concept.subWeight}
              letterSpacing={0.22}
              position="bottom"
            />
          ) : (
            <text
              x="100"
              y="166"
              textAnchor="middle"
              fill={onContainerColor}
              style={{ fontFamily: concept.subFont, fontSize: 8, fontWeight: concept.subWeight, letterSpacing: "0.28em" }}
            >
              {bottomText.slice(0, 28)}
            </text>
          )}
        </svg>
      </div>
    );
  }

  // ===== COMBINATION / ABSTRACT / MASCOT — refined lockups with optical balance =====
  const isStacked = concept.layout === "icon-top";
  const iconSize = size * (isStacked ? 0.36 : 0.28);

  return (
    <div
      style={{
        ...frame,
        display: "flex",
        flexDirection: isStacked ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: size * (isStacked ? 0.06 : 0.055),
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
        <Symbol symbol={concept.symbol} color={mark} accent={accent} stroke={stroke} duotone={duotone} />
      </svg>
      {!isStacked && <VerticalRule color={rule} height={iconSize * 0.7} />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isStacked ? "center" : "flex-start",
          gap: size * 0.018,
        }}
      >
        <span
          style={{
            fontFamily: concept.headingFont,
            fontWeight: concept.headingWeight,
            color: fg,
            fontSize: size * 0.135,
            letterSpacing: `${concept.letterSpacing}em`,
            lineHeight: 1,
          }}
        >
          {display}
        </span>
        {concept.tagline && (
          <span
            style={{
              fontFamily: concept.subFont,
              fontWeight: concept.subWeight,
              color: fg,
              opacity: 0.7,
              fontSize: size * 0.036,
              letterSpacing: `${concept.subLetterSpacing}em`,
              textTransform: "uppercase",
            }}
          >
            {concept.tagline}
          </span>
        )}
      </div>
    </div>
  );
}