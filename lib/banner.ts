import type { CSSProperties } from "react";

/** The colours a profile banner can use: the app's own magenta, purple and blue, each in a
 *  dark, a plain and a light, plus four neutrals from the night ground. The database holds
 *  only these keys (profiles_banner_a_ok / _b_ok), never a free colour. */
export const SWATCHES = [
  { key: "mag-dark", label: "Deep magenta", hex: "#7a2450" },
  { key: "mag", label: "Magenta", hex: "#e0398a" },
  { key: "mag-light", label: "Soft magenta", hex: "#f0a6c6" },
  { key: "pur-dark", label: "Deep purple", hex: "#5d5294" },
  { key: "pur", label: "Purple", hex: "#9184d9" },
  { key: "pur-light", label: "Soft purple", hex: "#b5abfc" },
  { key: "blu-dark", label: "Deep blue", hex: "#3b5aa8" },
  { key: "blu", label: "Blue", hex: "#4c7df0" },
  { key: "blu-light", label: "Soft blue", hex: "#7ea6ff" },
  { key: "ink", label: "Ink", hex: "#1b1d29" },
  { key: "night", label: "Night", hex: "#2a2146" },
  { key: "slate", label: "Slate", hex: "#3f424d" },
  { key: "mist", label: "Mist", hex: "#cfd3e5" },
] as const;

export type SwatchKey = (typeof SWATCHES)[number]["key"];

export const PATTERNS = [
  { key: "stripes-diagonal", label: "Diagonal stripes" },
  { key: "stripes-straight", label: "Straight stripes" },
  { key: "dots", label: "Polka dots" },
  { key: "checker", label: "Checkerboard" },
  { key: "gradient", label: "Gradient" },
  { key: "spiral", label: "Spiral" },
] as const;

export type PatternKey = (typeof PATTERNS)[number]["key"];

export type Banner = { pattern: PatternKey; a: SwatchKey; b: SwatchKey };

/** A spiral wound out from the middle, as an SVG that covers whatever box it paints. The arms
 *  run well past the edges, so a wide banner is filled with them rather than a lone swirl. */
function spiralImage(A: string, B: string): string {
  const k = 2.3; // distance between turns, divided by 2π
  const pts: string[] = [];
  for (let t = 0; t * k <= 230; t += 0.15) {
    const r = t * k;
    pts.push(`${(175 + r * Math.cos(t)).toFixed(1)},${(50 + r * Math.sin(t)).toFixed(1)}`);
  }
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 350 100' preserveAspectRatio='xMidYMid slice'>` +
    `<rect width='350' height='100' fill='${A}'/>` +
    `<polyline points='${pts.join(" ")}' fill='none' stroke='${B}' stroke-width='5.5' stroke-linejoin='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** What everyone has until they choose: the original night-purple diagonal stripe. */
export const DEFAULT_BANNER: Banner = { pattern: "stripes-diagonal", a: "night", b: "ink" };

const HEX: Record<string, string> = Object.fromEntries(SWATCHES.map((s) => [s.key, s.hex]));
export const isSwatch = (k: string): k is SwatchKey => k in HEX;
export const isPattern = (k: string): k is PatternKey => PATTERNS.some((p) => p.key === k);

/** A saved banner (any column may be missing) as a complete one. */
export function bannerOf(p?: { banner_pattern?: string | null; banner_a?: string | null; banner_b?: string | null }): Banner {
  const pattern = p?.banner_pattern && isPattern(p.banner_pattern) ? p.banner_pattern : DEFAULT_BANNER.pattern;
  const a = p?.banner_a && isSwatch(p.banner_a) ? p.banner_a : DEFAULT_BANNER.a;
  const b = p?.banner_b && isSwatch(p.banner_b) ? p.banner_b : DEFAULT_BANNER.b;
  return { pattern, a, b };
}

/** The CSS that paints a banner. Plain data, so a server page can hand it to a client component. */
export function bannerStyle(banner: Banner): CSSProperties {
  const A = HEX[banner.a];
  const B = HEX[banner.b];
  switch (banner.pattern) {
    case "stripes-straight":
      return { backgroundColor: A, backgroundImage: `repeating-linear-gradient(90deg, ${A} 0 10px, ${B} 10px 20px)` };
    case "dots":
      return {
        backgroundColor: A,
        backgroundImage: `radial-gradient(circle, ${B} 3.5px, transparent 4px), radial-gradient(circle, ${B} 3.5px, transparent 4px)`,
        backgroundSize: "22px 22px",
        backgroundPosition: "0 0, 11px 11px",
      };
    case "checker":
      return { backgroundColor: A, backgroundImage: `repeating-conic-gradient(${A} 0 25%, ${B} 0 50%)`, backgroundSize: "26px 26px" };
    case "spiral":
      return { backgroundColor: A, backgroundImage: spiralImage(A, B), backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
    case "gradient":
      return { backgroundColor: A, backgroundImage: `linear-gradient(90deg, ${A}, ${B})` };
    case "stripes-diagonal":
    default:
      return { backgroundColor: A, backgroundImage: `repeating-linear-gradient(135deg, ${A} 0 8px, ${B} 8px 16px)` };
  }
}
