import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { SLOTS, TOKEN_SIZE, itemSrc, colourHex, isFramed, normalizeToken, turnedBox, type SizeKey, type TokenDesign } from "./token";

// Drawing a token: one badge shape in three tones of its colour (the outline is the art's
// own near-black), a band in the rim colour just inside the edge when the shape is framed,
// then up to five items from the uploaded set, flipped, turned (in 45-degree steps) or
// shrunk as asked, each centred where it was dragged to. An item set behind the badge is
// drawn first and the shape over it, so only what hangs out past the edge shows; the rest
// go on after, in the saved order, the last on top. The shape takes the middle 22 of
// the 32 cells, small on purpose: an item at its drawn size reaches the rim, one dragged
// outward hangs over it, a shrunk one sits inside like heraldry. The browser shows it two
// to four times larger with the pixels kept square.

type Sprite = { w: number; h: number; data: Uint8ClampedArray };
const decoded = new Map<string, Sprite | null>();

function item(slug: string): Sprite | null {
  const hit = decoded.get(slug);
  if (hit !== undefined) return hit;
  let out: Sprite | null = null;
  try {
    const png = PNG.sync.read(readFileSync(join(process.cwd(), "public", itemSrc(slug))));
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
/** The full shape's reach from the centre: 22 cells across, leaving room to hang over. A
 *  badge at 75 or 50 is the same shape, smaller. */
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

/** The picture of an item once flipped and turned: whole quarter turns move each pixel to
 *  its place; a diagonal turn is rotated at four times the size and brought back down by
 *  taking each cell's commonest colour, which keeps pixel art solid where a plain turn of a
 *  small sprite would leave holes. The box is turnedBox's, which the designer clamps to. */
function turned(sp: Sprite, flip: boolean, t: number): Sprite {
  const box = turnedBox(sp.w, sp.h, t);
  const out = new Uint8ClampedArray(box.w * box.h * 4);
  const at = (x: number, y: number) => (flip ? sp.w - 1 - x : x) + y * sp.w;

  if (t % 2 === 0) {
    const q = t / 2;
    for (let sy = 0; sy < sp.h; sy++) {
      for (let sx = 0; sx < sp.w; sx++) {
        const src = at(sx, sy) * 4;
        if (sp.data[src + 3] === 0) continue;
        let dx: number, dy: number;
        switch (q) {
          case 1: dx = sp.h - 1 - sy; dy = sx; break;
          case 2: dx = sp.w - 1 - sx; dy = sp.h - 1 - sy; break;
          case 3: dx = sy; dy = sp.w - 1 - sx; break;
          default: dx = sx; dy = sy;
        }
        out.set(sp.data.subarray(src, src + 4), (dy * box.w + dx) * 4);
      }
    }
    return { w: box.w, h: box.h, data: out };
  }

  const K = 4;
  const th = (t * Math.PI) / 4;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const W = box.w;
  const H = box.h;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const votes = new Map<number, number>();
      let solid = 0;
      for (let j = 0; j < K; j++) {
        for (let i = 0; i < K; i++) {
          // This sample's place relative to the middle of the box, then back through the
          // turn to the source, where it falls in a source pixel.
          const u = x + (i + 0.5) / K - W / 2;
          const v = y + (j + 0.5) / K - H / 2;
          const sx = Math.floor(u * cos + v * sin + sp.w / 2);
          const sy = Math.floor(-u * sin + v * cos + sp.h / 2);
          if (sx < 0 || sy < 0 || sx >= sp.w || sy >= sp.h) continue;
          const src = at(sx, sy) * 4;
          if (sp.data[src + 3] < 128) continue;
          solid++;
          const key = (sp.data[src] << 24) | (sp.data[src + 1] << 16) | (sp.data[src + 2] << 8) | sp.data[src + 3];
          votes.set(key, (votes.get(key) ?? 0) + 1);
        }
      }
      if (solid * 2 < K * K) continue;
      let best = 0;
      let bestN = -1;
      for (const [key, n] of votes) if (n > bestN) { best = key; bestN = n; }
      const o = (y * W + x) * 4;
      out[o] = (best >>> 24) & 255;
      out[o + 1] = (best >>> 16) & 255;
      out[o + 2] = (best >>> 8) & 255;
      out[o + 3] = best & 255;
    }
  }
  return { w: W, h: H, data: out };
}

/** Lay an item's pixels over the picture, its centre where it was dragged to (the designer
 *  places it the same way). */
function blendSprite(px: Uint8Array, sp: Sprite, cx: number, cy: number) {
  const ox = Math.floor(C + cx - sp.w / 2);
  const oy = Math.floor(C + cy - sp.h / 2);
  for (let sy = 0; sy < sp.h; sy++) {
    for (let sx = 0; sx < sp.w; sx++) {
      const s = (sy * sp.w + sx) * 4;
      const a = sp.data[s + 3];
      if (a === 0) continue;
      const x = ox + sx;
      const y = oy + sy;
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

  // The icons, in the saved order (the last on top), each as the turned, flipped and
  // shrunk picture it will be. The first `under` of them go under the badge shape.
  const layers = d.order.split("").flatMap((k, at) => {
    const key = k as (typeof SLOTS)[number];
    const slug = d[key];
    if (slug === "none") return [];
    const sp = item(slug);
    if (!sp) return [];
    return [{ behind: at < d.under, sp: turned(resized(sp, d[`${key}_size`]), d[`${key}_flip`], d[`${key}_turn`]), x: d[`${key}_x`], y: d[`${key}_y`] }];
  });

  for (const l of layers) if (l.behind) blendSprite(px, l.sp, l.x, l.y);

  // The shape (unless there is none), and for a framed one the same shape again inside the
  // rim band (thinner on the smallest badge, where three cells would be most of it).
  if (d.shape !== "none") {
    const family = SHAPE[d.shape.replace("-frame", "")] ?? SHAPE.circle;
    const r = (R * d.badge_size) / 100;
    const band = d.badge_size === 50 ? 2 : 3;
    if (isFramed(d.shape)) {
      paintShape(px, family(r), tones(colourHex(d.rim)));
      paintShape(px, family(r - band), tones(colourHex(d.fill)));
    } else {
      paintShape(px, family(r), tones(colourHex(d.fill)));
    }
  }

  for (const l of layers) if (!l.behind) blendSprite(px, l.sp, l.x, l.y);

  return PNG.sync.write(png);
}
