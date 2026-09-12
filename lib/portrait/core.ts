import { OPTIONS, type PortraitOption } from "./manifest";

// Portraits are layered 128x128 art from the Portrait Maker sprite sheets.
//
// The original tool recolours with a palette-replace shader: the art is drawn
// in one fixed palette and specific colours are swapped for the player's
// choice. That's reproduced here — 53 distinct colours across the whole set,
// of which seven are skin, six are hair and three are the pupils. Everything
// else (sclera, lips, metal) the tool leaves alone, which is why it offers
// exactly three colour pickers plus a background.

/** The sheets' own cell size. */
export const SIZE = 128;

/** The composed frame: cropped tight to the head, so it fills the picture.
 *  Must match FRAME and ART in scripts/build-neck.mjs. */
export const FRAME = 120;

/** Where a 128x128 sheet cell lands in that frame: centred on the head, the
 *  tallest hair against the top, the neck running off the bottom. */
export const ART = { x: -2, y: 0 } as const;

// ------------------------------------------------------------- the palette

/** Skin, lightest to darkest, exactly as drawn. #d3bea8 is the flat scalp the
 *  Cranium layer paints — miss it and every head wears a beige cap. */
const SKIN_SRC = [
  "#fde9d5", "#f3c99e", "#f2b39c", "#e5ba8d", "#d3bea8", "#ca9071", "#bc9485", "#845e4b",
];
/** Hair, lightest to darkest. The eyebrows (#312723) and the stubble shade the
 *  beards use (#4e4742) follow hair too, as they do in the original. The stray
 *  near-duplicates are the artist's own anti-aliasing. */
const HAIR_SRC = [
  "#fae0c5", "#a58264", "#865c32", "#6d4b29", "#6c4620", "#58391a", "#4e4742",
  "#423024", "#422f23", "#36271d", "#35271d", "#32231d", "#312723", "#291c17",
];
/** The pupils. */
const EYE_SRC = ["#5a7896", "#3c5a78", "#1e3c5a"];

/** The step each ramp is anchored on — the colour a player is really picking
 *  when they choose "skin". The others move with it. */
const SKIN_ANCHOR = "#f3c99e"; // the dominant skin tone
const HAIR_ANCHOR = "#6c4620"; // the dominant hair tone
const EYE_ANCHOR = "#3c5a78";

export type Swatches = { skin: string; hair: string; eye: string; bg: string };

export const SKIN_CHOICES = [
  "#f3c99e", "#ffdfc4", "#e0ac69", "#c68642", "#8d5524", "#5c3a21",
  "#cfe3d4", "#cdc0e8", "#bcd8e8", "#e8c0cf", "#b9c4a0",
];
export const HAIR_CHOICES = [
  "#6c4620", "#2a2230", "#8a5a33", "#c98b4b", "#e6d3a3", "#b6bdc9",
  "#e0398a", "#9184d9", "#4c7df0", "#3fae86", "#d94a3a", "#f0a6c6",
];
export const EYE_CHOICES = [
  "#3c5a78", "#3a2a20", "#4c7df0", "#3fae86", "#9184d9", "#a8641f",
  "#c9c9d4", "#e0398a", "#c95b5b",
];
export const BG_CHOICES = [
  "#2a2146", "#1b1d29", "#3a1b34", "#1b2b3a", "#2b3320", "#3a2b1b", "#20203a", "#232532",
];

// ----------------------------------------------------------------- colour

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Rebuild a ramp around a chosen colour, keeping each step's distance from
 *  the anchor so the shading survives the swap.
 *
 *  The distances are squeezed to fit rather than clipped: the art's brightest
 *  hair step sits a long way above its base, so a light blond asked for the
 *  full offset would blow the highlight out to cream and put a beige cap on
 *  every head. Squeezing keeps the highlight a highlight. */
function reramp(
  src: string[],
  anchor: string,
  target: string,
  ceiling: number,
): Record<string, string> {
  const [th, ts, tl] = rgbToHsl(...hexToRgb(target));
  const [, , anchorL] = rgbToHsl(...hexToRgb(anchor));

  const ls = src.map((c) => rgbToHsl(...hexToRgb(c))[2]);
  const headroom = Math.max(...ls) - anchorL;
  const footroom = anchorL - Math.min(...ls);
  const up = headroom > 0 ? Math.min(ceiling - tl, headroom) / headroom : 1;
  const down = footroom > 0 ? Math.min(tl - 0.05, footroom) / footroom : 1;

  const out: Record<string, string> = {};
  for (const c of src) {
    const [, srcS, srcL] = rgbToHsl(...hexToRgb(c));
    const d = srcL - anchorL;
    const l = Math.max(0.03, Math.min(0.98, tl + d * (d >= 0 ? up : down)));
    // Keep a little of the source's own saturation so the darkest steps
    // don't go flat.
    const s = Math.max(0, Math.min(1, ts * 0.85 + srcS * 0.15));
    out[c.toLowerCase()] = hslToHex(th, s, l);
  }
  return out;
}

/** The full source-colour → chosen-colour map for one face. */
export function paletteFor(sw: Swatches): Map<number, [number, number, number]> {
  const table = {
    ...reramp(SKIN_SRC, SKIN_ANCHOR, sw.skin, 0.95),
    ...reramp(HAIR_SRC, HAIR_ANCHOR, sw.hair, 0.86),
    ...reramp(EYE_SRC, EYE_ANCHOR, sw.eye, 0.9),
  };

  const map = new Map<number, [number, number, number]>();
  for (const [from, to] of Object.entries(table)) {
    const [r, g, b] = hexToRgb(from);
    map.set((r << 16) | (g << 8) | b, hexToRgb(to));
  }
  return map;
}

// ----------------------------------------------------------------- layers

/** Back to front. The sheet names say where they go: *Back behind the head,
 *  "BelowBeard" under the beard, Layered* on top of everything. */
export const SHEET_ORDER = [
  // The scalp is the back of the skull, so it goes under everything — draw it
  // after the back hair and it sits on top of the hair.
  "Cranium",
  "HairBack",
  "LayeredAccessoryBack",
  // The neck's continuation sits in front of the hair that falls behind it
  // and behind the jaw, so the seam is under the chin.
  "Neck",
  "EarsBack",
  "Jaws",
  "EarsFront",
  "Eyes",
  "pupils",
  "Eyebrows",
  "Noses",
  "Mouths",
  "AccessoriesBelowBeard",
  "Beards",
  "HairFront",
  "LayeredAccessories",
];

/** The tool's own controls, in the order it lists them. */
export const CONTROLS: { key: string; label: string; optional?: boolean }[] = [
  { key: "jaw", label: "JAW" },
  { key: "ears", label: "EARS" },
  { key: "eyes", label: "EYES" },
  { key: "eyebrows", label: "EYEBROWS", optional: true },
  { key: "nose", label: "NOSE" },
  { key: "mouth", label: "MOUTH" },
  { key: "hair", label: "HAIR", optional: true },
  { key: "beard", label: "BEARD", optional: true },
  // The tool's one MISC control, taken apart. Its cells paired a skin mark
  // with a worn thing by grid index — an eye scar came with antlers, an
  // eyepatch with freckles — so each kind is its own choice here.
  { key: "scars", label: "SCARS", optional: true },
  { key: "blemishes", label: "FRECKLES & MARKS", optional: true },
  { key: "horns", label: "HORNS", optional: true },
  { key: "eyewear", label: "EYEWEAR", optional: true },
  { key: "jewellery", label: "JEWELLERY", optional: true },
  { key: "jewellery2", label: "MORE JEWELLERY", optional: true },
];

export const NONE = "none";

export type PortraitConfig = Record<string, string>;

export const ALLOWED: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const c of CONTROLS) {
    const ids = (OPTIONS[c.key] ?? []).map((o) => o.id);
    out[c.key] = c.optional ? [NONE, ...ids] : ids;
  }
  out.skin = SKIN_CHOICES;
  out.hair_colour = HAIR_CHOICES;
  out.eye = EYE_CHOICES;
  out.bg = BG_CHOICES;
  return out;
})();

export function defaultPortrait(): PortraitConfig {
  const out: PortraitConfig = {};
  for (const [k, list] of Object.entries(ALLOWED)) out[k] = list[0];
  // A default face has eyebrows and hair and nothing else optional.
  for (const c of CONTROLS) if (c.optional) out[c.key] = NONE;
  out.eyebrows = ALLOWED.eyebrows[1] ?? NONE;
  out.hair = ALLOWED.hair[1] ?? NONE;
  return out;
}

export function normalizePortrait(raw: unknown): PortraitConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const out = defaultPortrait();
  for (const [key, list] of Object.entries(ALLOWED)) {
    const v = c[key];
    if (typeof v === "string" && list.includes(v)) out[key] = v;
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** How often an optional part turns up on a face nobody has chosen yet. */
const ODDS: Record<string, number> = {
  eyebrows: 92,
  hair: 90,
  beard: 22,
  scars: 12,
  blemishes: 35,
  horns: 8,
  eyewear: 18,
  jewellery: 20,
  jewellery2: 6,
};

export function portraitFromId(id: string): PortraitConfig {
  const out = defaultPortrait();
  for (const [key, list] of Object.entries(ALLOWED)) {
    const pool = list.filter((v) => v !== NONE);
    if (pool.length) out[key] = pool[hash(`${id}:${key}`) % pool.length];
  }
  for (const [key, pct] of Object.entries(ODDS)) {
    if (hash(`${id}#${key}`) % 100 >= pct) out[key] = NONE;
  }
  return out;
}

export function randomPortrait(): PortraitConfig {
  const out = defaultPortrait();
  const pick = (l: string[]) => l[Math.floor(Math.random() * l.length)];
  for (const [key, list] of Object.entries(ALLOWED)) out[key] = pick(list);
  for (const [key, pct] of Object.entries(ODDS)) {
    if (Math.random() * 100 >= pct) out[key] = NONE;
  }
  return out;
}

/** Every image file this face needs, already in draw order. Several controls
 *  can draw from one sheet — a scar and freckles are both skin marks — so a
 *  sheet may contribute more than one cell; within a sheet they go in id order,
 *  which is stable and doesn't matter since they never overlap. */
export function drawPlan(config: PortraitConfig): string[] {
  const c = normalizePortrait(config);

  // sheet -> the cells that sheet should draw
  const wanted = new Map<string, Set<string>>();
  const want = (cell: string) => {
    const [sheet, id] = cell.split("/");
    if (!wanted.has(sheet)) wanted.set(sheet, new Set());
    wanted.get(sheet)!.add(id);
  };

  for (const control of CONTROLS) {
    const id = c[control.key];
    if (!id || id === NONE) continue;
    const option = (OPTIONS[control.key] ?? []).find((o: PortraitOption) => o.id === id);
    for (const cell of option?.cells ?? []) want(cell);
  }

  // The scalp and the neck's continuation are single shapes with no choice
  // behind them.
  want("Cranium/00");
  want("Neck/00");

  return SHEET_ORDER.flatMap((sheet) =>
    [...(wanted.get(sheet) ?? [])].sort().map((id) => `${sheet}/${id}.png`),
  );
}

// ------------------------------------------------------------ url packing

const PACK_ORDER = Object.keys(ALLOWED).sort();

/** Bump this whenever the compositor changes — the palette, the draw order,
 *  the crop, the art. Faces are cached immutably for a year, and the packed
 *  spec only describes the config, so without this a fixed renderer keeps
 *  serving the broken picture out of everyone's browser cache. */
export const RENDER = "9";

export function packPortrait(config: PortraitConfig): string {
  const c = normalizePortrait(config);
  return [RENDER, ...PACK_ORDER.map((k) => ALLOWED[k].indexOf(c[k]).toString(36))].join(".");
}

export function unpackPortrait(packed: string): PortraitConfig | null {
  const parts = packed.split(".");
  // Links made before the render was versioned are one segment short; they
  // still describe a real face, so draw it rather than 404.
  if (parts.length === PACK_ORDER.length + 1) parts.shift();
  if (parts.length !== PACK_ORDER.length) return null;
  const out: PortraitConfig = {};
  for (let i = 0; i < PACK_ORDER.length; i++) {
    const key = PACK_ORDER[i];
    const at = parseInt(parts[i], 36);
    const list = ALLOWED[key];
    if (!Number.isFinite(at) || at < 0 || at >= list.length) return null;
    out[key] = list[at];
  }
  return out;
}

export function swatchesOf(c: PortraitConfig): Swatches {
  return { skin: c.skin, hair: c.hair_colour, eye: c.eye, bg: c.bg };
}
