import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { drawPlan, over, paint, SIZE, type FaceConfig } from "./core";

// Composing a portrait means decoding up to ~18 tiny indexed PNGs, painting
// each through the palette shader and stacking them. Decoded layers are
// cached for the life of the lambda, and the route caches the finished PNG
// immutably, so a given face is only ever built once per edge node.

const ASSETS = join(process.cwd(), "assets", "faces");
const decoded = new Map<string, Uint8ClampedArray>();

function layerPixels(relPath: string): Uint8ClampedArray | null {
  const hit = decoded.get(relPath);
  if (hit) return hit;

  try {
    const png = PNG.sync.read(readFileSync(join(ASSETS, relPath)));
    if (png.width !== SIZE || png.height !== SIZE) return null;
    const data = new Uint8ClampedArray(png.data);
    decoded.set(relPath, data);
    return data;
  } catch {
    // A missing layer shouldn't take the whole face down.
    return null;
  }
}

export function composeFace(config: FaceConfig, bg: string): Buffer {
  const out = new Uint8ClampedArray(SIZE * SIZE * 4);

  // Background first, fully opaque, so the portrait never shows the page.
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255;
  }

  for (const { path, ramp } of drawPlan(config)) {
    const px = layerPixels(path);
    if (px) over(out, paint(px, ramp));
  }

  const png = new PNG({ width: SIZE, height: SIZE });
  png.data = Buffer.from(out.buffer, out.byteOffset, out.length);
  return PNG.sync.write(png);
}
