import { hexToRgb, hslToHex, normalizePortrait, portraitFromId, reramp, rgbToHsl } from "@/lib/portrait/core";

/** The yellow "skin" of the pixel emoji, lightest to darkest. #ffd248 is the face itself. */
const YELLOW = ["#fff4d4", "#ffecb9", "#ffe38b", "#ffd248", "#ffba1f", "#ffa519", "#fba700", "#ff890c", "#b57519"];
const YELLOW_ANCHOR = "#ffd248";
/** A few faces (sunglasses and friends) are drawn in a second, warmer yellow. */
const YELLOW_2 = ["#ffe18f", "#ffd563", "#f8c877", "#f8bd43", "#f3aa29", "#fb8d28"];
const YELLOW_2_ANCHOR = "#ffd563";

/** The emoji with yellow skin: the faces and the hands. Only their yellow pixels change. */
const SKINNED = new Set([...Array.from({ length: 28 }, (_, i) => i + 1), ...Array.from({ length: 11 }, (_, i) => i + 45)]);
export const hasSkin = (e: string) => e.startsWith("pm-") && SKINNED.has(Number(e.slice(3)));

/** The skin someone chose in the face maker (or the one their face was given). */
export function skinOf(person: { id: string; avatar_config?: unknown } | null | undefined): string | null {
  if (!person) return null;
  const c = person.avatar_config ? normalizePortrait(person.avatar_config) : portraitFromId(person.id);
  return c.skin ?? null;
}

const cache = new Map<string, Record<string, string>>();
/** Yellow, re-ramped onto a skin colour the same way the face maker re-ramps its own skin. */
export function skinRamp(skin: string): Record<string, string> {
  const key = skin.toLowerCase();
  let m = cache.get(key);
  if (!m) {
    m = { ...reramp(YELLOW, YELLOW_ANCHOR, key, 0.95), ...reramp(YELLOW_2, YELLOW_2_ANCHOR, key, 0.95) };
    // The darkest yellows draw the mouths, eyes and outlines. Squeezed into the skin's own ramp they fade
    // into the face (most of all on dark skin), so they get their own step, well clear of the skin.
    const [h, sat, l] = rgbToHsl(...hexToRgb(key));
    const feature = hslToHex(h, Math.min(1, sat * 0.9 + 0.1), l > 0.4 ? Math.max(0.12, l - 0.42) : Math.max(0.04, l * 0.35));
    m["#b57519"] = feature;
    // The palest yellows are teeth and glints: they stay near white on any skin, or a grin goes flat.
    m["#ffecb9"] = hslToHex(h, sat * 0.35, Math.max(0.88, l + 0.1));
    m["#fff4d4"] = hslToHex(h, sat * 0.25, 0.95);
    m["#fb8d28"] = hslToHex(h, Math.min(1, sat * 0.9 + 0.1), l > 0.4 ? Math.max(0.18, l - 0.3) : Math.max(0.06, l * 0.5));
    cache.set(key, m);
  }
  return m;
}

/** CRYSTR colours for any picture: each pixel's brightness picked off a dark-blue, blue, blue-purple, pale
 *  lilac ramp (no pink), so the drawing keeps its shading but wears the app's blue-purple. */
const CRYSTR_STOPS: [number, [number, number, number]][] = [
  [0, [20, 18, 44]],
  [0.3, [52, 76, 190]],
  [0.55, [110, 120, 230]],
  [0.75, [145, 132, 217]],
  [0.9, [210, 206, 253]],
  [1, [255, 255, 255]],
];
export function crystrTint(r: number, g: number, b: number): [number, number, number] {
  const t = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  for (let i = 0; i < CRYSTR_STOPS.length - 1; i++) {
    const [a, ca] = CRYSTR_STOPS[i];
    const [z, cz] = CRYSTR_STOPS[i + 1];
    if (t <= z) {
      const u = (t - a) / (z - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cz[k] - ca[k]) * u)) as [number, number, number];
    }
  }
  return [255, 255, 255];
}
