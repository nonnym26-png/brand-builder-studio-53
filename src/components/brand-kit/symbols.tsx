import type { SymbolKey } from "./conceptTypes";

/**
 * Each symbol is a 100x100 viewBox SVG path/group.
 * Stroke vs fill is controlled by the renderer (props).
 */
export function Symbol({
  symbol,
  color,
  accent,
  stroke = false,
  duotone = false,
}: {
  symbol: SymbolKey;
  color: string;
  accent: string;
  stroke?: boolean;
  duotone?: boolean;
}) {
  const fill = stroke ? "none" : color;
  const sw = stroke ? 8 : 0;
  const a = duotone ? accent : color;

  switch (symbol) {
    case "none":
      return null;
    case "leaf":
      return (
        <g>
          <path d="M20 80 C 20 30, 60 10, 88 14 C 86 60, 60 86, 20 80 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M22 78 C 40 60, 60 40, 84 18" stroke={duotone ? a : (stroke ? color : "rgba(255,255,255,.3)")} strokeWidth={stroke ? 4 : 3} fill="none" />
        </g>
      );
    case "flame":
      return (
        <path d="M50 8 C 70 30, 78 44, 78 60 C 78 80, 64 92, 50 92 C 36 92, 22 80, 22 60 C 22 48, 30 38, 38 32 C 38 44, 44 50, 50 50 C 50 36, 46 22, 50 8 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
      );
    case "wave":
      return (
        <g fill="none" stroke={color} strokeWidth="10" strokeLinecap="round">
          <path d="M8 38 C 24 22, 40 54, 56 38 C 72 22, 88 54, 96 38" />
          <path d="M8 64 C 24 48, 40 80, 56 64 C 72 48, 88 80, 96 64" stroke={duotone ? a : color} />
        </g>
      );
    case "mountain":
      return (
        <g>
          <path d="M8 86 L 38 32 L 58 62 L 72 44 L 92 86 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          {duotone && <path d="M38 32 L 58 62 L 48 62 Z" fill={a} />}
        </g>
      );
    case "bolt":
      return <path d="M58 6 L 22 56 L 46 56 L 38 94 L 78 40 L 54 40 L 62 6 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
    case "shield":
      return (
        <g>
          <path d="M50 8 L 88 22 L 84 56 C 80 76, 66 88, 50 94 C 34 88, 20 76, 16 56 L 12 22 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          {duotone && <path d="M50 24 L 50 78" stroke={a} strokeWidth="6" />}
        </g>
      );
    case "key":
      return (
        <g>
          <circle cx="32" cy="50" r="18" fill={fill} stroke={color} strokeWidth={stroke ? 6 : 8} />
          <circle cx="32" cy="50" r="6" fill={duotone ? a : color} />
          <rect x="50" y="46" width="42" height="8" fill={color} />
          <rect x="74" y="54" width="6" height="12" fill={color} />
          <rect x="86" y="54" width="6" height="10" fill={color} />
        </g>
      );
    case "tools":
      return (
        <g>
          <g stroke={color} strokeWidth="8" strokeLinecap="round" fill="none">
            <path d="M22 78 L 60 40" />
            <path d="M78 78 L 50 50" />
          </g>
          <path d="M60 18 L 44 32 L 56 44 L 72 30 Z" fill={duotone ? a : color} />
          <circle cx="82" cy="82" r="10" fill="none" stroke={color} strokeWidth="6" />
        </g>
      );
    case "gear":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a2 = (i * Math.PI * 2) / 8;
            const x = 50 + Math.cos(a2) * 42;
            const y = 50 + Math.sin(a2) * 42;
            return <rect key={i} x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(${(a2 * 180) / Math.PI} ${x} ${y})`} />;
          })}
          <circle cx="50" cy="50" r="28" fill={fill} stroke={color} strokeWidth={sw} />
          <circle cx="50" cy="50" r="10" fill={duotone ? a : "rgba(0,0,0,0)"} stroke={color} strokeWidth={sw} />
        </g>
      );
    case "house":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round">
          <path d="M12 50 L 50 14 L 88 50 L 88 88 L 12 88 Z" />
          {duotone && <rect x="42" y="58" width="16" height="30" fill={a} />}
        </g>
      );
    case "paw":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw}>
          <ellipse cx="30" cy="34" rx="9" ry="12" />
          <ellipse cx="50" cy="22" rx="9" ry="12" />
          <ellipse cx="70" cy="34" rx="9" ry="12" />
          <ellipse cx="82" cy="56" rx="8" ry="10" />
          <path d="M50 50 C 30 50, 22 72, 32 84 C 42 94, 58 94, 68 84 C 78 72, 70 50, 50 50 Z" />
        </g>
      );
    case "wing":
      return <path d="M10 70 C 20 50, 40 40, 60 42 C 50 50, 50 58, 60 60 C 70 60, 80 52, 90 42 C 80 70, 60 86, 30 84 C 18 84, 10 78, 10 70 Z" fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
    case "anchor":
      return (
        <g fill="none" stroke={color} strokeWidth="8" strokeLinecap="round">
          <circle cx="50" cy="20" r="8" />
          <path d="M50 28 L 50 84" />
          <path d="M30 50 L 70 50" />
          <path d="M18 64 C 22 84, 50 92, 50 84" />
          <path d="M82 64 C 78 84, 50 92, 50 84" />
        </g>
      );
    case "compass":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw}>
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="6" />
          <polygon points="50,18 60,50 50,82 40,50" fill={duotone ? a : color} />
          <polygon points="50,18 60,50 50,50" fill={color} opacity="0.7" />
          <circle cx="50" cy="50" r="4" fill={color} />
        </g>
      );
    case "sun":
      return (
        <g stroke={color} strokeWidth="6" strokeLinecap="round">
          <circle cx="50" cy="50" r="18" fill={fill} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a2 = (i * Math.PI * 2) / 8;
            return <line key={i} x1={50 + Math.cos(a2) * 28} y1={50 + Math.sin(a2) * 28} x2={50 + Math.cos(a2) * 42} y2={50 + Math.sin(a2) * 42} />;
          })}
        </g>
      );
    case "tree":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round">
          <path d="M50 8 L 80 46 L 64 46 L 86 80 L 14 80 L 36 46 L 20 46 Z" />
          <rect x="44" y="80" width="12" height="14" fill={duotone ? a : color} />
        </g>
      );
    case "wrench":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round">
          <path d="M64 16 A 22 22 0 1 0 84 56 L 92 64 L 64 92 L 56 84 A 22 22 0 0 0 16 64 L 32 48 L 48 64 L 64 48 L 48 32 Z" />
        </g>
      );
    case "fork-knife":
      return (
        <g stroke={color} strokeWidth="6" fill={fill} strokeLinecap="round">
          <path d="M28 8 L 28 48 M22 8 L 22 28 M34 8 L 34 28 M28 48 L 28 92" />
          <path d="M70 8 C 60 20, 60 40, 70 48 L 70 92" />
        </g>
      );
    case "scissors":
      return (
        <g stroke={color} strokeWidth="5" fill="none" strokeLinecap="round">
          <circle cx="26" cy="74" r="11" />
          <circle cx="74" cy="74" r="11" />
          <path d="M34 66 L 88 14" stroke={duotone ? a : color} />
          <path d="M66 66 L 12 14" />
          <circle cx="50" cy="44" r="3" fill={color} stroke="none" />
        </g>
      );
    case "needle":
      return (
        <g stroke={color} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M14 86 L 86 14" strokeWidth="6" />
          <ellipse cx="20" cy="80" rx="9" ry="5" transform="rotate(-45 20 80)" />
          <circle cx="20" cy="80" r="2.5" fill={color} stroke="none" />
          <path d="M84 12 C 92 12, 92 22, 84 22" stroke={duotone ? a : color} />
        </g>
      );
    case "molecule":
      return (
        <g fill={color} stroke={color} strokeWidth="4">
          <line x1="30" y1="30" x2="70" y2="70" />
          <line x1="70" y1="30" x2="30" y2="70" />
          <line x1="50" y1="14" x2="50" y2="50" />
          <circle cx="50" cy="14" r="8" fill={duotone ? a : color} />
          <circle cx="30" cy="30" r="8" />
          <circle cx="70" cy="30" r="8" />
          <circle cx="30" cy="70" r="8" />
          <circle cx="70" cy="70" r="8" />
        </g>
      );
    case "pulse":
      return (
        <path d="M6 50 L 26 50 L 36 30 L 50 76 L 64 22 L 76 50 L 96 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      );
    case "stethoscope":
      return (
        <g fill="none" stroke={color} strokeWidth="6">
          <path d="M22 14 L 22 50 C 22 72, 50 72, 50 50 L 50 14" />
          <path d="M50 50 L 50 70 C 50 84, 70 84, 70 70 L 70 60" />
          <circle cx="70" cy="48" r="10" fill={duotone ? a : "none"} />
        </g>
      );
    case "book":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw}>
          <path d="M14 18 L 50 26 L 86 18 L 86 82 L 50 90 L 14 82 Z" />
          <line x1="50" y1="26" x2="50" y2="90" stroke={duotone ? a : color} strokeWidth="4" />
        </g>
      );
    case "camera":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw}>
          <rect x="10" y="28" width="80" height="56" rx="6" />
          <rect x="36" y="20" width="28" height="14" rx="2" />
          <circle cx="50" cy="56" r="16" fill={duotone ? a : "none"} stroke={color} strokeWidth="6" />
        </g>
      );
    case "code":
      return (
        <g fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 28 L 10 50 L 30 72" />
          <path d="M70 28 L 90 50 L 70 72" />
          <path d="M58 22 L 42 78" stroke={duotone ? a : color} />
        </g>
      );
    case "rocket":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round">
          <path d="M50 6 C 70 24, 74 50, 70 70 L 30 70 C 26 50, 30 24, 50 6 Z" />
          <circle cx="50" cy="40" r="8" fill={duotone ? a : "white"} />
          <path d="M30 70 L 18 90 L 38 78 Z" fill={duotone ? a : color} />
          <path d="M70 70 L 82 90 L 62 78 Z" fill={duotone ? a : color} />
        </g>
      );
    case "diamond-cut":
      return (
        <g fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round">
          <path d="M14 36 L 50 8 L 86 36 L 50 92 Z" />
          <path d="M14 36 L 86 36 M 36 36 L 50 92 M 64 36 L 50 92" stroke={duotone ? a : color} strokeWidth="3" fill="none" />
        </g>
      );
    case "hex-grid":
      return (
        <g fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round">
          <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill={fill} />
          <polygon points="50,28 70,40 70,60 50,72 30,60 30,40" fill={duotone ? a : "none"} />
        </g>
      );
    case "circuit":
      return (
        <g fill={color} stroke={color} strokeWidth="4" strokeLinecap="square">
          <line x1="10" y1="50" x2="40" y2="50" />
          <line x1="60" y1="50" x2="90" y2="50" />
          <line x1="50" y1="10" x2="50" y2="40" />
          <line x1="50" y1="60" x2="50" y2="90" />
          <rect x="40" y="40" width="20" height="20" fill={duotone ? a : color} />
          <circle cx="10" cy="50" r="5" />
          <circle cx="90" cy="50" r="5" />
          <circle cx="50" cy="10" r="5" />
          <circle cx="50" cy="90" r="5" />
        </g>
      );
    case "abstract-arc":
      return (
        <g fill="none" strokeWidth="12" strokeLinecap="round">
          <path d="M14 78 A 40 40 0 0 1 86 78" stroke={color} />
          <path d="M30 78 A 24 24 0 0 1 70 78" stroke={duotone ? a : color} opacity="0.7" />
        </g>
      );
    case "abstract-orbit":
      return (
        <g fill="none" stroke={color} strokeWidth="6">
          <ellipse cx="50" cy="50" rx="42" ry="18" transform="rotate(-25 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="18" transform="rotate(25 50 50)" stroke={duotone ? a : color} />
          <circle cx="50" cy="50" r="8" fill={color} />
        </g>
      );
    case "abstract-prism":
      return (
        <g strokeWidth="0">
          <polygon points="50,10 90,80 10,80" fill={color} opacity="0.85" />
          <polygon points="50,10 90,80 50,80" fill={duotone ? a : color} opacity="0.5" />
        </g>
      );
    default:
      return null;
  }
}