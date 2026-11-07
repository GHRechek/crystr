import { normalizePortrait, portraitFromId, reramp } from "@/lib/portrait/core";

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
    cache.set(key, m);
  }
  return m;
}
