import { FONTS, type BrandState, type IconKey } from "./types";

function IconShape({ icon, color, size = 56 }: { icon: IconKey; color: string; size?: number }) {
  if (icon === "none") return null;
  const s = size;
  switch (icon) {
    case "circle":
      return <svg width={s} height={s} viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill={color} /></svg>;
    case "square":
      return <svg width={s} height={s} viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="6" fill={color} /></svg>;
    case "triangle":
      return <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,12 92,86 8,86" fill={color} /></svg>;
    case "diamond":
      return <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,8 92,50 50,92 8,50" fill={color} /></svg>;
    case "hex":
      return <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,6 92,28 92,72 50,94 8,72 8,28" fill={color} /></svg>;
    case "ring":
      return <svg width={s} height={s} viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10" /></svg>;
    case "spark":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100">
          <path d="M50 8 L58 42 L92 50 L58 58 L50 92 L42 58 L8 50 L42 42 Z" fill={color} />
        </svg>
      );
    default:
      return null;
  }
}

export function LogoMark({
  state,
  bg,
  fg,
  iconColor,
  size = "lg",
}: {
  state: BrandState;
  bg: string;
  fg: string;
  iconColor: string;
  size?: "sm" | "md" | "lg";
}) {
  const font = FONTS[state.headingFont];
  const display = state.uppercase ? state.brandName.toUpperCase() : state.brandName;
  const fontSize = size === "lg" ? 56 : size === "md" ? 32 : 20;
  const iconSize = size === "lg" ? 80 : size === "md" ? 48 : 28;

  const textBlock = (
    <span
      style={{
        fontFamily: font.family,
        fontWeight: state.weight,
        letterSpacing: `${state.letterSpacing}em`,
        color: fg,
        fontSize,
        lineHeight: 1,
      }}
    >
      {display || "Your Brand"}
    </span>
  );

  if (state.layout === "wordmark") {
    return (
      <div className="flex items-center justify-center" style={{ background: bg, padding: "2.5rem 3rem", borderRadius: 12 }}>
        {textBlock}
      </div>
    );
  }

  if (state.layout === "monogram") {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ background: bg, padding: "2.5rem", borderRadius: 12 }}>
        <div className="flex items-center justify-center" style={{ width: iconSize * 1.3, height: iconSize * 1.3, background: iconColor, borderRadius: 8 }}>
          <span style={{ fontFamily: font.family, fontWeight: 700, color: bg, fontSize: iconSize * 0.65, lineHeight: 1 }}>
            {(state.initials || state.brandName.slice(0, 2) || "AB").toUpperCase()}
          </span>
        </div>
        {state.brandName && (
          <span style={{ fontFamily: font.family, fontWeight: state.weight, color: fg, fontSize: fontSize * 0.45, letterSpacing: `${state.letterSpacing}em` }}>
            {display}
          </span>
        )}
      </div>
    );
  }

  if (state.layout === "icon-top") {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ background: bg, padding: "2.5rem 3rem", borderRadius: 12 }}>
        <IconShape icon={state.icon} color={iconColor} size={iconSize} />
        {textBlock}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4" style={{ background: bg, padding: "2.5rem 3rem", borderRadius: 12 }}>
      <IconShape icon={state.icon} color={iconColor} size={iconSize} />
      {textBlock}
    </div>
  );
}