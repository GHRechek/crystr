import { MANIFEST, type FaceAsset } from "./manifest";

// The portrait system. Artwork is V-ktor/pixel-art-portraits (MIT) — 96x96
// indexed PNGs where the channels are palette slots, not colours:
//
//   red   -> the ramp's dark step
//   green -> the ramp's light step
//   blue  -> the ramp's shadow step
//   grey  -> lerp(black, white) by luminance, for outlines and eye whites
//
// Reproduced from the original Godot shader so a face composed here looks
// exactly like one composed in the tool the art was drawn for.

export type Ramp = readonly [light: string, dark: string, shadow: string];

/** The ramps the art was drawn against, plus a few in Crystr's own palette. */
export const RAMPS: Record<string, Ramp> = {
  rose: ["#ffe6e2", "#996b88", "#4c335c"],
  clay: ["#cc8665", "#4c335c", "#0f0814"],
  frost: ["#e0f2f3", "#6a7587", "#181420"],
  sand: ["#eecc8c", "#8c2a2a", "#2a1722"],
  violet: ["#9682d9", "#4c2f93", "#381e78"],
  blood: ["#bf5656", "#590e0e", "#3e111a"],
  orchid: ["#d099c8", "#4c335c", "#2a1722"],
  iron: ["#4b4b60", "#181420", "#181420"],
  sea: ["#a4dddb", "#253a5e", "#22264f"],
  slate: ["#788bbd", "#253579", "#22264f"],
  moss: ["#d0da91", "#314829", "#0a1a0d"],
  cream: ["#fdf5cc", "#cc8665", "#644133"],
  bronze: ["#eecc8c", "#644133", "#2a1722"],
  // The bi palette the rest of the app is built on.
  magenta: ["#f7cadd", "#e0398a", "#7a2450"],
  blurple: ["#d2cefd", "#9184d9", "#5d5294"],
  blue: ["#dce6ff", "#4c7df0", "#3b5aa8"],
};

export const RAMP_KEYS = Object.keys(RAMPS);

/** Ramps that read as skin. The rest are for hair, cloth and eyes. */
export const SKIN_RAMPS = ["rose", "clay", "sand", "cream", "bronze", "orchid", "frost", "sea", "moss"];
export const HAIR_RAMPS = RAMP_KEYS;
export const CLOTH_RAMPS = RAMP_KEYS;
export const EYE_RAMPS = RAMP_KEYS;

const BLACK = "#0f0814";
const WHITE = "#ffffff";

export const SIZE = 96;

// ------------------------------------------------------------------ layers

/** Which ramp a layer is painted with. */
export type Role = "skin" | "hair" | "primary" | "secondary" | "detail" | "eye" | "horn";

export type LayerSpec = {
  /** Directory under assets/faces, and the config key that chooses it. */
  dir: string;
  role: Role;
  /** A companion <name>_shadow.png, drawn in skin, over the top. */
  shadowRole?: Role;
};

/** Back to front, matching the original scene's draw order. */
export const DRAW_ORDER: LayerSpec[] = [
  { dir: "hair/back", role: "hair" },
  { dir: "body", role: "skin" },
  { dir: "cloths", role: "primary", shadowRole: "skin" },
  { dir: "neck", role: "detail" },
  { dir: "mouth", role: "skin" },
  { dir: "beard", role: "hair", shadowRole: "skin" },
  { dir: "nose", role: "skin" },
  { dir: "hair/base", role: "hair", shadowRole: "skin" },
  { dir: "eyes", role: "eye", shadowRole: "skin" },
  { dir: "glasses", role: "detail", shadowRole: "skin" },
  { dir: "brows", role: "skin" },
  { dir: "hair/front", role: "hair", shadowRole: "skin" },
  { dir: "ears", role: "hair" },
  { dir: "horns", role: "horn" },
];

/** Layers you can leave off entirely. */
export const OPTIONAL = new Set(["beard", "glasses", "horns", "neck", "hair/back", "hair/front"]);

export const NONE = "none";

/** The config key for a directory: "hair/base" -> "hairBase". */
export function keyFor(dir: string): string {
  return dir.replace(/\/(.)/g, (_, c: string) => c.toUpperCase());
}

export type FaceConfig = {
  // layer choices, by keyFor(dir)
  [key: string]: string;
};

export const RAMP_KEYS_BY_ROLE: Record<Role, string[]> = {
  skin: SKIN_RAMPS,
  hair: HAIR_RAMPS,
  primary: CLOTH_RAMPS,
  secondary: CLOTH_RAMPS,
  detail: CLOTH_RAMPS,
  eye: EYE_RAMPS,
  horn: RAMP_KEYS,
};

/** The colour choices a face carries, separate from its shapes. */
export const COLOR_KEYS: { key: string; role: Role; label: string }[] = [
  { key: "skinRamp", role: "skin", label: "SKIN" },
  { key: "hairRamp", role: "hair", label: "HAIR" },
  { key: "eyeRamp", role: "eye", label: "EYES" },
  { key: "primaryRamp", role: "primary", label: "CLOTHES" },
  { key: "secondaryRamp", role: "secondary", label: "SECOND CLOTH" },
  { key: "detailRamp", role: "detail", label: "TRIM" },
];

export const BACKGROUNDS = [
  "#2a2146", "#1b1d29", "#3a1b34", "#1b2b3a", "#2b3320", "#3a2b1b", "#20203a", "#232532",
];

function allowedFor(dir: string): string[] {
  const names = (MANIFEST[dir] ?? []).map((a: FaceAsset) => a.name);
  return OPTIONAL.has(dir) ? [NONE, ...names] : names;
}

export const ALLOWED: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const layer of DRAW_ORDER) out[keyFor(layer.dir)] = allowedFor(layer.dir);
  for (const c of COLOR_KEYS) out[c.key] = RAMP_KEYS_BY_ROLE[c.role];
  out.bg = BACKGROUNDS;
  return out;
})();

export function defaultFace(): FaceConfig {
  const out: FaceConfig = {};
  for (const [key, allowed] of Object.entries(ALLOWED)) out[key] = allowed[0];
  out.hairBase = ALLOWED.hairBase.includes("female01") ? "female01" : ALLOWED.hairBase[0];
  out.beard = NONE;
  out.glasses = NONE;
  out.horns = NONE;
  out.skinRamp = "rose";
  out.hairRamp = "iron";
  out.eyeRamp = "slate";
  out.primaryRamp = "violet";
  out.secondaryRamp = "iron";
  out.detailRamp = "cream";
  out.bg = BACKGROUNDS[0];
  return out;
}

/** Nothing reaches the compositor that isn't one of ours. */
export function normalizeFace(raw: unknown): FaceConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const out = defaultFace();
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
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** How often an optional layer turns up on a face nobody has chosen yet. */
const ODDS: Record<string, number> = {
  beard: 18,
  glasses: 20,
  horns: 12,
  neck: 55,
  "hair/back": 45,
  "hair/front": 55,
};

export function faceFromId(id: string): FaceConfig {
  const out = defaultFace();
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    const pool = allowed.filter((v) => v !== NONE);
    if (pool.length) out[key] = pool[hash(`${id}:${key}`) % pool.length];
  }
  out.skinRamp = SKIN_RAMPS[hash(`${id}:skin`) % SKIN_RAMPS.length];
  for (const [dir, pct] of Object.entries(ODDS)) {
    if (hash(`${id}#${dir}`) % 100 >= pct) out[keyFor(dir)] = NONE;
  }
  return out;
}

export function randomFace(): FaceConfig {
  const out = defaultFace();
  const pick = (l: string[]) => l[Math.floor(Math.random() * l.length)];
  for (const [key, allowed] of Object.entries(ALLOWED)) out[key] = pick(allowed);
  out.skinRamp = pick(SKIN_RAMPS);
  for (const [dir, pct] of Object.entries(ODDS)) {
    if (Math.random() * 100 >= pct) out[keyFor(dir)] = NONE;
  }
  return out;
}

// --------------------------------------------------------------- the paint

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** The original shader, per pixel. `src` and `out` are RGBA byte arrays. */
export function paint(src: Uint8ClampedArray | Uint8Array, ramp: Ramp): Uint8ClampedArray {
  const [light, dark, shadow] = [hexToRgb(ramp[0]), hexToRgb(ramp[1]), hexToRgb(ramp[2])];
  const black = hexToRgb(BLACK);
  const white = hexToRgb(WHITE);
  const out = new Uint8ClampedArray(src.length);

  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    if (a === 0) continue;
    const r = src[i] / 255, g = src[i + 1] / 255, b = src[i + 2] / 255;

    // Channel-biased pixels are palette slots; neutral ones are line work.
    const weight = Math.min(10 * Math.max(Math.abs(r - g), Math.abs(b - g)), 1);
    const value = (r + g + b) / 3;
    const inv = 1 - weight;

    for (let ch = 0; ch < 3; ch++) {
      const slot = dark[ch] * r + light[ch] * g + shadow[ch] * b;
      const line = black[ch] * (1 - value) + white[ch] * value;
      out[i + ch] = slot * weight + line * inv;
    }
    out[i + 3] = a;
  }
  return out;
}

/** Straight alpha-over composite of `src` onto `dst`, both RGBA. */
export function over(dst: Uint8ClampedArray, src: Uint8ClampedArray): void {
  for (let i = 0; i < src.length; i += 4) {
    const sa = src[i + 3];
    if (sa === 0) continue;
    if (sa === 255) {
      dst[i] = src[i];
      dst[i + 1] = src[i + 1];
      dst[i + 2] = src[i + 2];
      dst[i + 3] = 255;
      continue;
    }
    const a = sa / 255;
    const da = dst[i + 3] / 255;
    const outA = a + da * (1 - a);
    for (let ch = 0; ch < 3; ch++) {
      dst[i + ch] = (src[i + ch] * a + dst[i + ch] * da * (1 - a)) / (outA || 1);
    }
    dst[i + 3] = outA * 255;
  }
}

/** Every image a config needs, in draw order, with the ramp for each. */
export function drawPlan(config: FaceConfig): { path: string; ramp: Ramp }[] {
  const c = normalizeFace(config);
  const ramps: Record<Role, Ramp> = {
    skin: RAMPS[c.skinRamp],
    hair: RAMPS[c.hairRamp],
    primary: RAMPS[c.primaryRamp],
    secondary: RAMPS[c.secondaryRamp],
    detail: RAMPS[c.detailRamp],
    eye: RAMPS[c.eyeRamp],
    horn: RAMPS[c.hairRamp],
  };

  const plan: { path: string; ramp: Ramp }[] = [];
  const PART_ROLE: Record<string, Role> = {
    primary: "primary",
    secondary: "secondary",
    details: "detail",
  };

  for (const layer of DRAW_ORDER) {
    const name = c[keyFor(layer.dir)];
    if (!name || name === NONE) continue;
    const asset = (MANIFEST[layer.dir] ?? []).find((a: FaceAsset) => a.name === name);

    if (asset?.parts?.length) {
      // An outfit is its parts, each painted with its own ramp — picking one
      // in isolation would put a necklace on a bare chest.
      for (const part of asset.parts) {
        plan.push({
          path: `${layer.dir}/${name}_${part}.png`,
          ramp: ramps[PART_ROLE[part] ?? layer.role],
        });
      }
    } else {
      plan.push({ path: `${layer.dir}/${name}.png`, ramp: ramps[layer.role] });
    }

    if (asset?.shadow && layer.shadowRole) {
      plan.push({ path: `${layer.dir}/${name}_shadow.png`, ramp: ramps[layer.shadowRole] });
    }
  }
  return plan;
}

/** A short, stable id for a config — used to cache a composed portrait. */
export function faceKey(config: FaceConfig): string {
  const c = normalizeFace(config);
  const flat = Object.keys(c).sort().map((k) => `${k}=${c[k]}`).join("&");
  return hash(flat).toString(36) + hash(flat.split("").reverse().join("")).toString(36);
}

// --------------------------------------------------------------- url packing

/** Stable field order, so a packed face stays readable across deploys. */
const PACK_ORDER = Object.keys(ALLOWED).sort();

/** A config as a short URL segment: one base36 index per field. Content
 *  addressed, so a changed face is a changed URL and the composed PNG can be
 *  cached forever. */
export function packFace(config: FaceConfig): string {
  const c = normalizeFace(config);
  return PACK_ORDER.map((k) => ALLOWED[k].indexOf(c[k]).toString(36)).join(".");
}

export function unpackFace(packed: string): FaceConfig | null {
  const parts = packed.split(".");
  if (parts.length !== PACK_ORDER.length) return null;

  const out: FaceConfig = {};
  for (let i = 0; i < PACK_ORDER.length; i++) {
    const key = PACK_ORDER[i];
    const at = parseInt(parts[i], 36);
    const allowed = ALLOWED[key];
    if (!Number.isFinite(at) || at < 0 || at >= allowed.length) return null;
    out[key] = allowed[at];
  }
  return out;
}
