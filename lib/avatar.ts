import { createAvatar } from "@dicebear/core";
import { pixelArt } from "@dicebear/collection";

// Portraits are DiceBear's "Pixel Art" style — a 16x16 grid rendered with
// crispEdges, which is the 16-bit look the design asked for and stays sharp
// at 28px in a whisper list. CC0 1.0 (public domain), so it ships freely.
export const AVATAR_CREDIT = {
  style: "Pixel Art",
  creator: "DiceBear",
  license: "CC0 1.0",
  url: "https://creativecommons.org/publicdomain/zero/1.0/",
};

/** A face is a set of choices: variant names and 6-digit hex, no "#". */
export type AvatarConfig = Record<string, string>;

const NONE = "none";

/** The realistic half of the skin ramp; the fantasy tones follow it. */
const HUMAN_SKIN = ["ffdbb4", "edb98a", "d08b5b", "ae5d29", "8d5524", "613d30"];

type Group = {
  key: string;
  label: string;
  values: string[];
  /** Optional layers get a "none" entry and a matching *Probability flag. */
  optional?: boolean;
};

function variants(key: string): string[] {
  const prop = (pixelArt.schema.properties as Record<string, { items?: { enum?: string[] } }>)[key];
  const list = prop?.items?.enum ?? [];
  return [...list].reverse(); // the schema lists them backwards
}

export const SHAPE_GROUPS: Group[] = [
  { key: "hair", label: "HAIR", values: variants("hair") },
  { key: "eyes", label: "EYES", values: variants("eyes") },
  { key: "mouth", label: "MOUTH", values: variants("mouth") },
  { key: "clothing", label: "WHAT YOU WEAR", values: variants("clothing") },
  { key: "beard", label: "BEARD", values: variants("beard"), optional: true },
  { key: "hat", label: "HAT", values: variants("hat"), optional: true },
  { key: "glasses", label: "GLASSES", values: variants("glasses"), optional: true },
  { key: "accessories", label: "ACCESSORIES", values: variants("accessories"), optional: true },
];

// Curated swatches rather than a free picker: fewer choices, and every one
// of them sits inside the app's palette.
export const COLOR_GROUPS: { key: string; label: string; values: string[] }[] = [
  {
    key: "skinColor",
    label: "SKIN",
    values: [...HUMAN_SKIN, "a3c9a8", "c4a6e8", "8fb7c9"],
  },
  {
    key: "hairColor",
    label: "HAIR COLOUR",
    values: [
      "2a2230", "4a3524", "8a5a33", "c98b4b", "e6d3a3", "b6bdc9",
      "e0398a", "9184d9", "4c7df0", "3fae86", "d94a3a", "f0a6c6",
    ],
  },
  {
    key: "eyesColor",
    label: "EYES",
    values: ["3a2a20", "4c7df0", "3fae86", "9184d9", "a8641f", "c9c9d4", "e0398a"],
  },
  {
    key: "clothingColor",
    label: "CLOTHES",
    values: [
      "2b2e3d", "7a2450", "3b5aa8", "5d5294", "4a3524", "1f5f4e",
      "e0398a", "9184d9", "4c7df0", "c9a24b",
    ],
  },
  {
    key: "backgroundColor",
    label: "BEHIND YOU",
    values: ["2a2146", "1b1d29", "3a1b34", "1b2b3a", "2b3320", "3a2b1b", "20203a", "232532"],
  },
];

const ALLOWED: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const g of SHAPE_GROUPS) out[g.key] = g.optional ? [NONE, ...g.values] : g.values;
  for (const g of COLOR_GROUPS) out[g.key] = g.values;
  return out;
})();

export const DEFAULT_AVATAR: AvatarConfig = {
  hair: "short08",
  eyes: "variant04",
  mouth: "happy10",
  clothing: "variant11",
  beard: NONE,
  hat: NONE,
  glasses: NONE,
  accessories: NONE,
  skinColor: "edb98a",
  hairColor: "2a2230",
  eyesColor: "3a2a20",
  clothingColor: "2b2e3d",
  backgroundColor: "2a2146",
};

/** Drops anything that isn't one of ours, so a hand-edited config can't
 *  smuggle values into the renderer. */
export function normalize(raw: unknown): AvatarConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const out: AvatarConfig = { ...DEFAULT_AVATAR };
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    const v = c[key];
    if (typeof v === "string" && allowed.includes(v)) out[key] = v;
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // A final avalanche, so neighbouring inputs don't land near each other.
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** How often an optional layer shows up on a face nobody has chosen yet. */
const ODDS: Record<string, number> = { hat: 18, beard: 18, glasses: 22, accessories: 12 };

/** The face you have before you build one. Derived from your id, so it never
 *  changes under you — and because it's a real config, the builder opens on
 *  exactly the face the rest of the app is already showing. */
export function avatarFromId(id: string): AvatarConfig {
  // Each field gets its own hash. A single rolling generator correlates
  // across short lists and hands out glasses to everybody.
  const pick = (key: string, list: string[]) => list[hash(`${id}:${key}`) % list.length];

  const out: AvatarConfig = {};
  for (const g of SHAPE_GROUPS) out[g.key] = pick(g.key, g.values);
  for (const g of COLOR_GROUPS) out[g.key] = pick(g.key, g.values);

  // Green, lilac and blue are a choice somebody makes, not a starting point.
  out.skinColor = pick("skin", HUMAN_SKIN);

  for (const [key, pct] of Object.entries(ODDS)) {
    if (hash(`${id}#${key}`) % 100 >= pct) out[key] = NONE;
  }
  return out;
}

export function randomAvatar(): AvatarConfig {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  const out: AvatarConfig = {};
  for (const [key, allowed] of Object.entries(ALLOWED)) out[key] = pick(allowed);
  // "none" on every optional layer at once reads as unfinished.
  if (Math.random() < 0.5) out.hat = NONE;
  if (Math.random() < 0.6) out.beard = NONE;
  return out;
}

function toOptions(config: AvatarConfig): Record<string, unknown> {
  const c = normalize(config);
  const opts: Record<string, unknown> = {};

  for (const g of SHAPE_GROUPS) {
    if (g.optional && c[g.key] === NONE) {
      opts[`${g.key}Probability`] = 0;
      continue;
    }
    if (g.optional) opts[`${g.key}Probability`] = 100;
    opts[g.key] = [c[g.key]];
  }
  for (const g of COLOR_GROUPS) opts[g.key] = [c[g.key]];

  return opts;
}

/** SVG markup for a built portrait. */
export function avatarSvg(config: AvatarConfig, size: number): string {
  return createAvatar(pixelArt, { size, ...toOptions(config) }).toString();
}

/** SVG markup for someone who hasn't built one — stable for a given id. */
export function avatarSvgForSeed(seed: string, size: number): string {
  return avatarSvg(avatarFromId(seed), size);
}
