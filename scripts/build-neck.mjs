// Draws assets/portrait/Neck/00.png — the neck the Portrait Maker sheets
// never finished, so a portrait runs off the bottom of the frame instead of
// ending in the tapered stub where the artist stopped.
//
// The jaws end at a 20px column, x 54..73. That's the FRONT of the neck.
// The face is turned three-quarters to the left, so the far side of the neck
// — the back — shows past the jaw's right edge, rising under the far ear to
// the skull. The sheets have none of it: below the far jaw corner there's a
// notch of background. This cell paints both halves: the front column,
// bowing forward a little the way a throat does, and the back, sloping up to
// meet the ear. Jaws and EarsBack draw on top, so the seams are under them.
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

// Measured on the sheets, in 128-space.
const CHIN_LEFT = 54; //  the jaw's neck stub, second-to-last row
const JAW_RIGHT = 73; //  the jaw's right edge, held straight from y 104 down
const STUB_BOTTOM = 111;
const EAR_BOTTOM = 88; // EarsBack sits at x 80..103, y 55..88

/** Skin steps, straight from the sheets: base, shade, deep. */
const BASE = "#f3c99e";
const SHADE = "#ca9071";
const DEEP = "#845e4b";

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const clamp = (t, a, b) => Math.max(a, Math.min(b, t));

/** The front edge: the stub's own line for its last two rows — the jaw's
 *  final row is tapered and doesn't cover the full column, so the neck has to
 *  be there behind it — then bowing forward the way a throat does. */
function left(y) {
  if (y < STUB_BOTTOM - 1) return 60; // under the jaw, which covers it
  return CHIN_LEFT - clamp(Math.round((y - STUB_BOTTOM) * 0.45), 0, 4);
}

/** The back edge: straight under the ear, easing out into the trapezius. */
function right(y) {
  if (y <= 100) return 88;
  return Math.round(88 + clamp((y - 100) / 11, 0, 1) * 3);
}

/** The back of the neck's top edge, rising to the skull behind the ear. */
function top(x) {
  if (x >= 88) return EAR_BOTTOM - 2;
  if (x >= 82) return EAR_BOTTOM - 2 + (88 - x);
  return 92; // under the jaw's cheek, which covers it
}

function tone(x) {
  if (x <= JAW_RIGHT) return BASE; // the front, flat like the stub
  if (x <= 88) return SHADE; //      the back, turned from the light
  return DEEP; //                    its silhouette
}

const png = new PNG({ width: FRAME, height: FRAME });
png.data.fill(0);

for (let sy = EAR_BOTTOM - 2; sy < 128; sy++) {
  for (let sx = left(sy); sx <= right(sy); sx++) {
    if (sy < top(sx)) continue;
    const x = sx + ART.x;
    const y = sy + ART.y;
    if (x < 0 || y < 0 || x >= FRAME || y >= FRAME) continue;
    const [r, g, b] = rgb(tone(sx));
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
