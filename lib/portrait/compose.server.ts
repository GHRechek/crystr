import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  ART,
  FRAME,
  LAYER_ALIASES,
  SCALP_SRC,
  SIZE,
  drawPlan,
  paletteFor,
  scalpFor,
  sheetOffset,
  swatchesOf,
  type PortraitConfig,
} from "./core";

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

/** The face, drawn. `bare`: just the head, on nothing (no background colour). */
export function composePortrait(config: PortraitConfig, { bare = false, overrides }: { bare?: boolean; /** Edited cells (see lib/sprites), keyed Sheet/id.png, drawn in place of the shipped ones. */ overrides?: Map<string, Uint8ClampedArray> } = {}): Buffer {
  const sw = swatchesOf(config);
  const palette = paletteFor(sw);
  const scalp = scalpFor(sw);

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
    out[i + 3] = bare ? 0 : 255;
  }

  for (const path of drawPlan(config)) {
    const src = overrides?.get(path) ?? cell(path);
    if (!src) continue;
    // The scalp colour is also a jaw shading colour, so the buzz applies to
    // the Cranium layer alone — everywhere else it stays skin.
    const layer = path.slice(0, path.indexOf("/"));
    const buzz = scalp && layer === "Cranium" ? scalp : null;
    const alias = LAYER_ALIASES[layer];
    // A part nudged up or down (the Portrait Maker's sliders) is drawn that far from its place.
    const shift = sheetOffset(config, layer);

    for (let y = 0; y < SIZE; y++) {
      const dy = y + ART.y + shift;
      if (dy < 0 || dy >= FRAME) continue;

      for (let x = 0; x < SIZE; x++) {
        const dx = x + ART.x;
        if (dx < 0 || dx >= FRAME) continue;

        const s = (y * SIZE + x) * 4;
        const a = src[s + 3];
        if (a === 0) continue;

        // Palette replace: only colours the art actually uses are swapped, so
        // sclera, lips, metal and bone keep their own, as in the original.
        const key = (src[s] << 16) | (src[s + 1] << 8) | src[s + 2];
        const swapped = buzz && key === SCALP_SRC ? buzz : palette.get(alias?.[key] ?? key);
        const r = swapped ? swapped[0] : src[s];
        const g = swapped ? swapped[1] : src[s + 1];
        const b = swapped ? swapped[2] : src[s + 2];

        const d = (dy * FRAME + dx) * 4;
        if (a === 255) {
          out[d] = r;
          out[d + 1] = g;
          out[d + 2] = b;
          out[d + 3] = 255;
          continue;
        }
        // Over what's there: on the background (opaque) this is the plain blend it always was; on
        // nothing (a bare head) the colour is the art's own and it takes on the art's alpha.
        const al = a / 255;
        const da = out[d + 3] / 255;
        const oa = al + da * (1 - al);
        out[d] = (r * al + out[d] * da * (1 - al)) / oa;
        out[d + 1] = (g * al + out[d + 1] * da * (1 - al)) / oa;
        out[d + 2] = (b * al + out[d + 2] * da * (1 - al)) / oa;
        out[d + 3] = Math.round(oa * 255);
      }
    }
  }

  // Facing right is the same face mirrored, every layer together, so a scar
  // or an earring swaps sides with the fringe rather than floating.
  if (config.facing === "right") {
    const row = Buffer.alloc(FRAME * 4);
    for (let y = 0; y < FRAME; y++) {
      const off = y * FRAME * 4;
      out.copy(row, 0, off, off + FRAME * 4);
      for (let x = 0; x < FRAME; x++) row.copy(out, off + x * 4, (FRAME - 1 - x) * 4, (FRAME - x) * 4);
    }
  }

  return PNG.sync.write(png);
}
