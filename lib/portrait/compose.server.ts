import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  CROP,
  SIZE,
  drawPlan,
  paletteFor,
  swatchesOf,
  type PortraitConfig,
} from "./core";

// Stacking up to fifteen 128x128 cells and swapping the palette as each one
// lands. Decoded cells are cached for the life of the lambda; the route caches
// the finished PNG immutably, so a given face is built once per edge node.

const ASSETS = join(process.cwd(), "assets", "portrait");
const decoded = new Map<string, Uint8ClampedArray>();

function cell(relPath: string): Uint8ClampedArray | null {
  const hit = decoded.get(relPath);
  if (hit) return hit;
  try {
    const png = PNG.sync.read(readFileSync(join(ASSETS, relPath)));
    if (png.width !== SIZE || png.height !== SIZE) return null;
    const data = new Uint8ClampedArray(png.data);
    decoded.set(relPath, data);
    return data;
  } catch {
    return null;
  }
}

export function composePortrait(config: PortraitConfig): Buffer {
  const sw = swatchesOf(config);
  const palette = paletteFor(sw);
  const out = new Uint8ClampedArray(SIZE * SIZE * 4);

  const bg = sw.bg.replace("#", "");
  const br = parseInt(bg.slice(0, 2), 16);
  const bgg = parseInt(bg.slice(2, 4), 16);
  const bb = parseInt(bg.slice(4, 6), 16);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = br;
    out[i + 1] = bgg;
    out[i + 2] = bb;
    out[i + 3] = 255;
  }

  for (const path of drawPlan(config)) {
    const src = cell(path);
    if (!src) continue;

    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      if (a === 0) continue;

      // Palette replace: only colours the art actually uses are swapped, so
      // sclera, lips and metal keep their own colour, as in the original.
      const swapped = palette.get((src[i] << 16) | (src[i + 1] << 8) | src[i + 2]);
      const r = swapped ? swapped[0] : src[i];
      const g = swapped ? swapped[1] : src[i + 1];
      const b = swapped ? swapped[2] : src[i + 2];

      if (a === 255) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        continue;
      }
      const al = a / 255;
      out[i] = r * al + out[i] * (1 - al);
      out[i + 1] = g * al + out[i + 1] * (1 - al);
      out[i + 2] = b * al + out[i + 2] * (1 - al);
    }
  }

  // Crop to the framing every screen uses.
  const png = new PNG({ width: CROP.w, height: CROP.h });
  for (let y = 0; y < CROP.h; y++) {
    const from = ((y + CROP.y) * SIZE + CROP.x) * 4;
    png.data.set(out.subarray(from, from + CROP.w * 4), y * CROP.w * 4);
  }
  return PNG.sync.write(png);
}
