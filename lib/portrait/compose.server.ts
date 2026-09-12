import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { ART, FRAME, SIZE, drawPlan, paletteFor, swatchesOf, type PortraitConfig } from "./core";

// Stacking the sheet cells onto one frame and swapping the palette as each
// lands. Decoded cells are cached for the life of the lambda; the route caches
// the finished PNG immutably, so a given face is built once per edge node.

const ASSETS = join(process.cwd(), "assets", "portrait");
const decoded = new Map<string, Uint8ClampedArray | null>();

/** A 128x128 sheet cell. Nothing else is accepted. */
function cell(relPath: string): Uint8ClampedArray | null {
  const hit = decoded.get(relPath);
  if (hit !== undefined) return hit;

  let out: Uint8ClampedArray | null = null;
  try {
    const png = PNG.sync.read(readFileSync(join(ASSETS, relPath)));
    if (png.width === SIZE && png.height === SIZE) out = new Uint8ClampedArray(png.data);
  } catch {
    out = null;
  }
  decoded.set(relPath, out);
  return out;
}

export function composePortrait(config: PortraitConfig): Buffer {
  const sw = swatchesOf(config);
  const palette = paletteFor(sw);

  const png = new PNG({ width: FRAME, height: FRAME });
  const out = png.data;

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

    for (let y = 0; y < SIZE; y++) {
      const dy = y + ART.y;
      if (dy < 0 || dy >= FRAME) continue;

      for (let x = 0; x < SIZE; x++) {
        const dx = x + ART.x;
        if (dx < 0 || dx >= FRAME) continue;

        const s = (y * SIZE + x) * 4;
        const a = src[s + 3];
        if (a === 0) continue;

        // Palette replace: only colours the art actually uses are swapped, so
        // sclera, lips, metal and bone keep their own, as in the original.
        const swapped = palette.get((src[s] << 16) | (src[s + 1] << 8) | src[s + 2]);
        const r = swapped ? swapped[0] : src[s];
        const g = swapped ? swapped[1] : src[s + 1];
        const b = swapped ? swapped[2] : src[s + 2];

        const d = (dy * FRAME + dx) * 4;
        if (a === 255) {
          out[d] = r;
          out[d + 1] = g;
          out[d + 2] = b;
          continue;
        }
        const al = a / 255;
        out[d] = r * al + out[d] * (1 - al);
        out[d + 1] = g * al + out[d + 1] * (1 - al);
        out[d + 2] = b * al + out[d + 2] * (1 - al);
      }
    }
  }

  return PNG.sync.write(png);
}
