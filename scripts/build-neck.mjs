// Draws assets/portrait/Neck/00.png — a short continuation of the jaw's own
// neck, so a portrait runs off the bottom of the frame instead of ending in
// the tapered stub where the artist stopped drawing.
//
// All 26 jaws end identically: x 54..73 on their second-to-last row, tapered
// to 60..71 on the last. This cell continues that 20px column straight down
// in the jaw's flat base tone, which is exactly what those last rows are. The
// jaw draws over it, so the seam is under the chin.
//
// Drawn at frame size and landing at the origin; the compositor tells frame
// cells from 128px sheet cells by size. FRAME and ART must match
// lib/portrait/core.ts.
//
// Run: node scripts/build-neck.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const FRAME = 120;
const ART = { x: -2, y: 0 };

/** The jaw's neck on the sheets, in 128-space. */
const LEFT = 54;
const RIGHT = 73;
const FROM = 110;

/** The jaw's flat base tone, straight from the sheets. */
const BASE = "#f3c99e";

const png = new PNG({ width: FRAME, height: FRAME });
png.data.fill(0);
const [r, g, b] = [parseInt(BASE.slice(1, 3), 16), parseInt(BASE.slice(3, 5), 16), parseInt(BASE.slice(5, 7), 16)];

for (let y = FROM + ART.y; y < FRAME; y++) {
  for (let x = LEFT + ART.x; x <= RIGHT + ART.x; x++) {
    if (x < 0 || x >= FRAME) continue;
    const i = (y * FRAME + x) * 4;
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = 255;
  }
}

mkdirSync("assets/portrait/Neck", { recursive: true });
writeFileSync("assets/portrait/Neck/00.png", PNG.sync.write(png));
console.log(`wrote Neck/00 at ${FRAME}x${FRAME}`);
