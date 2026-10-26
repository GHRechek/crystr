import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { TOKEN_SIZE, colourHex, isFramed, normalizeToken, type SizeKey, type TokenDesign } from "./token";

// Drawing a token: one badge shape in three tones of its colour (the outline is the art's
// own near-black), a band in the rim colour just inside the edge when the shape is framed,
// then the two items from the uploaded set, flipped, turned or shrunk as asked, each
// centred where it was dragged to, the chosen one on top. The shape takes the middle 22 of
// the 32 cells, small on purpose: an item at its drawn size reaches the rim, one dragged
// outward hangs over it, a shrunk one sits inside like heraldry. The browser shows it two
// to four times larger with the pixels kept square.

const ITEMS_DIR = join(process.cwd(), "public", "badges", "items");
type Sprite = { w: number; h: number; data: Uint8ClampedArray };
const decoded = new Map<string, Sprite | null>();

function item(slug: string): Sprite | null {
  const hit = decoded.get(slug);
  if (hit !== undefined) return hit;
  let out: Sprite | null = null;
  try {
    const png = PNG.sync.read(readFileSync(join(ITEMS_DIR, `${slug}.png`)));
    if (png.width <= 24 && png.height <= 24) out = { w: png.width, h: png.height, data: new Uint8ClampedArray(png.data) };
  } catch {
    out = null;
  }
  decoded.set(slug, out);
  return out;
}

/** Scaled by hundredths, pixel for pixel (nearest), as a pixel tool would. */
function resized(sp: Sprite, size: SizeKey): Sprite {
  const f = size / 100;
  if (f === 1) return sp;
  const w = Math.max(1, Math.round(sp.w * f));
  const h = Math.max(1, Math.round(sp.h * f));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(sp.h - 1, Math.floor((y + 0.5) / f));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(sp.w - 1, Math.floor((x + 0.5) / f));
      data.set(sp.data.subarray((sy * sp.w + sx) * 4, (sy * sp.w + sx) * 4 + 4), (y * w + x) * 4);
    }
  }
  return { w, h, data };
}

type RGB = [number, number, number];
const OUTLINE: RGB = [10, 10, 18];

function rgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
type Tones = { light: RGB; base: RGB; dark: RGB };
/** Light, base and dark steps of one colour, as pixel art shades them. */
function tones(hex: string): Tones {
  const base = rgb(hex);
  return { light: mix(base, [255, 255, 255], 0.38), base, dark: mix(base, [0, 0, 0], 0.4) };
}

const N = TOKEN_SIZE;
const C = N / 2;
/** The shape's reach from the centre: 22 cells across, leaving room to hang over. */
const R = 11;

// Inside tests take the pixel's centre. Each shape is a family by size, so the framed
// kinds can draw the same shape again, three cells in.
type Inside = (x: number, y: number) => boolean;
const circle = (r: number): Inside => (x, y) => (x + 0.5 - C) ** 2 + (y + 0.5 - C) ** 2 <= r * r;
const square = (half: number): Inside => (x, y) => Math.abs(x + 0.5 - C) <= half && Math.abs(y + 0.5 - C) <= half;
const diamond = (half: number): Inside => (x, y) => Math.abs(x + 0.5 - C) + Math.abs(y + 0.5 - C) <= half;
const hexagon = (r: number): Inside => (x, y) => {
  const dx = Math.abs(x + 0.5 - C);
  const dy = Math.abs(y + 0.5 - C);
  return dy <= r * 0.87 && dx <= r && dx * 0.5 + dy * 0.87 <= r * 0.87 + 0.3;
};
/** A heater shield: flat top, straight sides to the middle, then curving to a point. */
const shield = (half: number): Inside => (x, y) => {
  const dx = Math.abs(x + 0.5 - C);
  const dy = y + 0.5 - C;
  if (dy < -half || dx > half) return false;
  if (dy <= 0) return true;
  const t = dy / half;
  if (t > 1) return false;
  return dx <= half * Math.pow(1 - t * t, 0.7);
};

const SHAPE: Record<string, (size: number) => Inside> = {
  circle: (s) => circle(s),
  shield: (s) => shield(s),
  diamond: (s) => diamond(s * 1.15),
  square: (s) => square(s * 0.92),
  hexagon: (s) => hexagon(s * 1.05),
};

function set(px: Uint8Array, x: number, y: number, c: RGB) {
  const i = (y * N + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = 255;
}

/** Fill a shape: outline, then light along the top and left, dark along the bottom and
 *  right, as the sheets shade their shapes. */
function paintShape(px: Uint8Array, inside: Inside, t: Tones) {
  const edge = (x: number, y: number) => !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!inside(x, y)) continue;
      if (edge(x, y)) {
        set(px, x, y, OUTLINE);
        continue;
      }
      const nearTop = edge(x, y - 1) || edge(x - 1, y);
      const nearBottom = edge(x, y + 1) || edge(x + 1, y);
      set(px, x, y, nearTop && !nearBottom ? t.light : nearBottom && !nearTop ? t.dark : t.base);
    }
  }
}

function blendSprite(px: Uint8Array, sp: Sprite, flip: boolean, rot: number, cx: number, cy: number) {
  // Flip, then turn in quarter steps, by remapping where each source pixel lands; the
  // sprite's centre goes where it was dragged to (the designer places it the same way).
  const w = rot % 2 === 0 ? sp.w : sp.h;
  const h = rot % 2 === 0 ? sp.h : sp.w;
  const ox = Math.floor(C + cx - w / 2);
  const oy = Math.floor(C + cy - h / 2);
  for (let sy = 0; sy < sp.h; sy++) {
    for (let sx0 = 0; sx0 < sp.w; sx0++) {
      const s = (sy * sp.w + sx0) * 4;
      const a = sp.data[s + 3];
      if (a === 0) continue;
      const sx = flip ? sp.w - 1 - sx0 : sx0;
      let dx: number, dy: number;
      switch (rot) {
        case 1: dx = sp.h - 1 - sy; dy = sx; break;
        case 2: dx = sp.w - 1 - sx; dy = sp.h - 1 - sy; break;
        case 3: dx = sy; dy = sp.w - 1 - sx; break;
        default: dx = sx; dy = sy;
      }
      const x = ox + dx;
      const y = oy + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const d = (y * N + x) * 4;
      const al = a / 255;
      const bal = px[d + 3] / 255;
      const out = al + bal * (1 - al);
      for (let k = 0; k < 3; k++) {
        px[d + k] = out > 0 ? Math.round((sp.data[s + k] * al + px[d + k] * bal * (1 - al)) / out) : 0;
      }
      px[d + 3] = Math.round(out * 255);
    }
  }
}

export function composeToken(raw: TokenDesign): Buffer {
  const d = normalizeToken(raw);
  const png = new PNG({ width: N, height: N });
  const px = png.data as unknown as Uint8Array;
  px.fill(0);

  // The shape, and for a framed one the same shape again inside the rim band.
  const family = SHAPE[d.shape.replace("-frame", "")] ?? SHAPE.circle;
  if (isFramed(d.shape)) {
    paintShape(px, family(R), tones(colourHex(d.rim)));
    paintShape(px, family(R - 3), tones(colourHex(d.fill)));
  } else {
    paintShape(px, family(R), tones(colourHex(d.fill)));
  }

  const first = d.top === "a" ? "b" : "a";
  for (const which of [first, d.top] as const) {
    const slug = which === "a" ? d.a : d.b;
    if (slug === "none") continue;
    const sp = item(slug);
    if (!sp) continue;
    blendSprite(
      px,
      resized(sp, which === "a" ? d.a_size : d.b_size),
      which === "a" ? d.a_flip : d.b_flip,
      which === "a" ? d.a_rot : d.b_rot,
      which === "a" ? d.a_x : d.b_x,
      which === "a" ? d.a_y : d.b_y,
    );
  }

  return PNG.sync.write(png);
}
