// Draws assets/portrait/Neck/00.png — the neck the Portrait Maker sheets
// never finished, so a portrait runs off the bottom of the frame instead of
// ending in the tapered stub where the artist stopped.
//
// The jaws end at a flat 20px column, x 54..73: the front of the neck, left
// unshaded. The face is turned three-quarters, so the far side of the neck
// shows past the jaw's right edge too, receding under the far ear. The sheets
// have none of that.
//
// This cell paints the neck the way the face is painted — as a form, not a
// column. A cylinder lit from the front left, the face's own five skin steps
// stepping across it on boundaries that curve with the silhouette; a cast
// shadow under the chin so the chin's underside reads as an edge over the
// neck; and the far side, past the jawline, a narrow wedge in the two darkest
// steps so it recedes instead of sitting beside the jaw as a slab. Jaws and
// EarsBack draw on top, so the seams are under them.
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
const STUB_BOTTOM = 111; // its last row
const JAW_RIGHT = 73; //  the jaw's right edge, held straight from y 104 down
const EAR_BOTTOM = 88; // EarsBack sits at x 80..103, y 55..88

/** The face's skin steps, light to dark, straight from the sheets. bc9485 is
 *  the muted tone the jaw uses along its lit edge. */
const STEPS = ["#f3c99e", "#e5ba8d", "#ca9071", "#845e4b"];
const EDGE = "#bc9485";

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const clamp = (t, a, b) => Math.max(a, Math.min(b, t));

// ------------------------------------------------------------ silhouette

/** The front edge: the stub's line under the chin, then bowing forward the
 *  way a throat does. Above the stub it's under the jaw, which covers it. */
function left(y) {
  if (y < STUB_BOTTOM - 1) return 60;
  return CHIN_LEFT - clamp(Math.round((y - STUB_BOTTOM) * 0.45), 0, 4);
}

/** The back edge: from the skull base behind the ear, easing out a little. */
function right(y) {
  return 83 + Math.round(clamp((y - 96) / 24, 0, 1) * 3);
}

/** Where the far side begins under the ear: rising to meet it. */
function top(x) {
  if (x >= 84) return EAR_BOTTOM - 2;
  if (x >= 79) return EAR_BOTTOM - 2 + (84 - x);
  return 96; // under the jaw's cheek, which covers it
}

// ------------------------------------------------------------------ form

/** Which step a pixel takes. */
function stepAt(x, y) {
  const l = left(y);
  const r = right(y);

  // The far side, past the jawline and above the stub: a narrow wedge that
  // recedes. Two darkest steps only.
  if (y < STUB_BOTTOM - 1) return x > 79 ? 3 : 2;

  // Across the cylinder, front left to back right.
  const u = (x - l) / Math.max(1, r - l);
  let s = u < 0.4 ? 0 : u < 0.58 ? 1 : u < 0.78 ? 2 : 3;

  // The chin's shadow, cast down onto the neck and fading over five rows.
  // Broad right under the chin, narrowing to the underside of the jaw angle.
  const below = y - STUB_BOTTOM;
  if (below <= 1 && x >= l + 3) s += 1;
  else if (below <= 3 && x >= l + 8) s += 1;
  else if (below <= 5 && x >= l + 14 && x <= JAW_RIGHT + 4) s += 1;

  return clamp(s, 0, 3);
}

function tone(x, y) {
  // A one-pixel muted edge down the lit side, as the jaw has.
  if (y >= STUB_BOTTOM + 1 && x === left(y)) return EDGE;
  return STEPS[stepAt(x, y)];
}

const png = new PNG({ width: FRAME, height: FRAME });
png.data.fill(0);

for (let sy = EAR_BOTTOM - 2; sy < 128; sy++) {
  for (let sx = left(sy); sx <= right(sy); sx++) {
    if (sy < top(sx)) continue;
    const x = sx + ART.x;
    const y = sy + ART.y;
    if (x < 0 || y < 0 || x >= FRAME || y >= FRAME) continue;
    const [r, g, b] = rgb(tone(sx, sy));
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
