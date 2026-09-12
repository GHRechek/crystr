import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { ART, FRAME, SIZE, drawPlan, paletteFor, swatchesOf, type PortraitConfig } from "./core";

// Stacking the layers onto one frame and swapping the palette as each lands.
// Decoded cells are cached for the life of the lambda; the route caches the
// finished PNG immutably, so a given face is built once per edge node.

const ASSETS = join(process.cwd(), "assets", "portrait");

type Cell = { data: Uint8ClampedArray; size: number };
const decoded = new Map<string, Cell | null>();

/** Sheet cells are 128 and land offset into the frame; the shoulders are drawn
 *  at frame size and land at the origin. Nothing else is accepted. */
function cell(relPath: string): Cell | null {
  const hit = decoded.get(relPath);
  if (hit !== undefined) return hit;

  let out: Cell | null = null;
  try {
    const png = PNG.sync.read(readFileSync(join(ASSETS, relPath)));
    if (png.width === png.height && (png.width === SIZE || png.width === FRAME)) {
      out = { data: new Uint8ClampedArray(png.data), size: png.width };
    }
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

    const ox = src.size === FRAME ? 0 : ART.x;
    const oy = src.size === FRAME ? 0 : ART.y;

    for (let y = 0; y < src.size; y++) {
      const dy = y + oy;
      if (dy < 0 || dy >= FRAME) continue;

      for (let x = 0; x < src.size; x++) {
        const dx = x + ox;
        if (dx < 0 || dx >= FRAME) continue;

        const s = (y * src.size + x) * 4;
        const a = src.data[s + 3];
        if (a === 0) continue;

        // Palette replace: only colours the art actually uses are swapped, so
        // sclera, lips, metal and bone keep their own, as in the original.
        const swapped = palette.get(
          (src.data[s] << 16) | (src.data[s + 1] << 8) | src.data[s + 2],
        );
        const r = swapped ? swapped[0] : src.data[s];
        const g = swapped ? swapped[1] : src.data[s + 1];
        const b = swapped ? swapped[2] : src.data[s + 2];

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
