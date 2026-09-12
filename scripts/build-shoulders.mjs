// Draws assets/portrait/Shoulders/NN.png — the body the Portrait Maker sheets
// never shipped. All 26 jaws end identically, mid-neck, at x 60..71 / y 111:
// an attachment point and nothing else. Without something below it, every
// portrait is a head floating on a colour.
//
// These cells are the full composed frame, not 128x128 sheet cells, because
// the shoulders run past the edge of the original art. The compositor tells
// them apart by size.
//
// Drawn in the sheets' own source palette: the neck and any bare chest use the
// skin steps, the garment its own five, so all of it recolours through the
// same replace table as a face does.
//
// Run: node scripts/build-shoulders.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

/** Must match FRAME and ART in lib/portrait/core.ts. */
const FRAME = 152;
const ART = { x: 14, y: 4 };

// Measured on the sheets, in 128-space. Every jaw is the same here.
//   src y=108: x 48..73   the jaw just above the chin's curve — the neck's
//                         true width, since a chin curves in over a neck
//   src y=110: x 54..73   the chin's underside, curving in
//   src y=111: x 60..71   the last row, tapered
// The right edge holds x=73 straight for seven rows: that's where the artist
// stopped, not where the neck ends. In a three-quarter view the far side of
// the neck shows past the jawline, under the far ear (EarsBack sits at
// x 80..103), turning away into shadow. So the neck runs from the jaw's left
// edge to under that ear — about two-thirds of the head's width — and the
// chin's curve sits on top of it.
const NECK_LEFT = 48 + ART.x;
const NECK_RIGHT = 81 + ART.x;
const JAW_BOTTOM = 111 + ART.y;
/** Right of this the neck is turning away from the light. */
const NECK_TURN = 73 + ART.x;

/** Where the shoulders begin, how wide the trapezius is before the slope
 *  starts, and how far the shoulders reach. */
const NECK_BASE = JAW_BOTTOM + 13;
const TRAP = 28;
const REACH = 52;
const BODY_CX = FRAME / 2;
const NECK_CX = (NECK_LEFT + NECK_RIGHT) / 2;

/** Skin, lightest to darkest, straight from the sheets. */
const SKIN = ["#fde9d5", "#f3c99e", "#e5ba8d", "#ca9071", "#845e4b"];
/** The garment's own ramp. None of these five appear anywhere in the original
 *  art, so swapping them for a shirt colour can never touch a face. */
const CLOTH = ["#a9b8dc", "#8fa0c8", "#5a6a94", "#39456a", "#242c46"];

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));

// ------------------------------------------------------------- silhouette

/** The top edge of the body at a given distance from centre: the trapezius
 *  falling away from the neck, then the deltoid rounding off. */
function shoulderTop(dx) {
  if (dx <= TRAP) return NECK_BASE;
  const t = clamp((dx - TRAP) / REACH);
  return NECK_BASE + 11 * Math.sqrt(t) + 5 * t ** 3;
}

function inBody(x, y) {
  const dx = Math.abs(x - BODY_CX);
  if (dx > FRAME / 2 + 2) return false;
  return y >= shoulderTop(dx);
}

/** The neck: the jaw's full width, flaring into the trapezius as it nears
 *  the shoulders. Jaws draws over everything above JAW_BOTTOM. */
function neckEdges(y) {
  const flare = clamp((y - JAW_BOTTOM - 3) / (NECK_BASE - JAW_BOTTOM - 3)) ** 1.5 * 8;
  return [NECK_LEFT - flare, NECK_RIGHT + flare];
}
function inNeck(x, y) {
  if (y < 96 || y > NECK_BASE + 6) return false;
  const [l, r] = neckEdges(y);
  return x >= l && x <= r;
}

// -------------------------------------------------------------- necklines
//
// True where skin shows instead of cloth. Depths are below the shoulder line.

// Each opening is as wide as the neck's base at the shoulder line, so the
// collar sits around the neck rather than pinching it.
const NECKLINES = {
  crew: (x, y) => ((x - NECK_CX) / 27) ** 2 + ((y - NECK_BASE) / 8) ** 2 < 1,
  scoop: (x, y) => ((x - NECK_CX) / 31) ** 2 + ((y - NECK_BASE) / 17) ** 2 < 1,
  vee: (x, y) => {
    const d = Math.abs(x - NECK_CX);
    return d < 30 && y < NECK_BASE + (30 - d) * 0.8;
  },
};

/** Three plain necklines. A shirt here is a colour and a neckline. */
const STYLES = [
  { id: "00", neckline: "crew" },
  { id: "01", neckline: "scoop" },
  { id: "02", neckline: "vee" },
];

// ----------------------------------------------------------------- light
//
// Front left, as it is on every face in the set, and the head casts down onto
// the chest. Bands follow the shoulder's own curve rather than running
// vertically, which is the difference between shading and stripes.

function lum(x, y) {
  const dx = (x - BODY_CX) / (FRAME / 2);
  const below = (y - shoulderTop(Math.abs(x - BODY_CX))) / 30;
  let l = 0.74 - dx * 0.26 - clamp(below, 0, 2) * 0.2;

  // The head's shadow, softened so its edge isn't a visible disc.
  const cast = Math.hypot((x - NECK_CX) / 1.45, (y - JAW_BOTTOM) / 1.0) / 32;
  l -= 0.3 * (1 - clamp(cast)) ** 1.4;

  // A thin rim along the very top of each shoulder, strongest on the lit side.
  const rim = clamp(1 - Math.abs(below) * 14);
  l += 0.13 * rim * clamp(0.5 - dx);
  return l;
}

/** Quantise to five steps, 0 = lightest. */
function stepAt(l) {
  if (l > 0.9) return 0;
  if (l > 0.68) return 1;
  if (l > 0.42) return 2;
  if (l > 0.24) return 3;
  return 4;
}

/** The neck's own shading, continuing the jaw's: base on the lit side,
 *  darkening to the right as the jaw does, and a band of the chin's shadow
 *  across the top so the chin's curve reads as an edge over it. */
function neckTone(x, y) {
  const [l, r] = neckEdges(y);
  const t = (x - l) / Math.max(1, r - l);
  let s = t < 0.5 ? 1 : t < 0.72 ? 2 : 3;
  // Past the jawline the neck is turning away: deepest shade, so it reads as
  // the far side rather than as width stuck on.
  if (x > NECK_TURN + 1) s = 4;
  if (y <= JAW_BOTTOM + 3) s += 1;
  return SKIN[clamp(s, 1, 4)];
}

function draw(style) {
  const png = new PNG({ width: FRAME, height: FRAME });
  png.data.fill(0);

  const put = (x, y, hex) => {
    if (x < 0 || y < 0 || x >= FRAME || y >= FRAME) return;
    const i = (y * FRAME + x) * 4;
    const [r, g, b] = rgb(hex);
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = 255;
  };

  const bareAt = NECKLINES[style.neckline];

  for (let y = 96; y < FRAME; y++) {
    for (let x = 0; x < FRAME; x++) {
      const body = inBody(x, y);
      const neck = inNeck(x, y);
      if (!body && !neck) continue;

      if (!body) {
        put(x, y, neckTone(x, y));
        continue;
      }

      if (bareAt(x, y)) {
        // Skin is never lit past the face's own base tone — the jaw's neck is
        // drawn flat base, and a chest brighter than the forehead reads as a
        // different object. The lightest step is for cloth only.
        put(x, y, SKIN[clamp(stepAt(lum(x, y) - 0.1), 1, 4)]);
      } else {
        put(x, y, CLOTH[clamp(stepAt(lum(x, y)), 0, 4)]);
      }
    }
  }

  // A dark seam where skin gives way to cloth, so a neckline reads as an edge
  // and not as a change of colour.
  for (let y = 96; y < FRAME - 1; y++) {
    for (let x = 0; x < FRAME; x++) {
      if (!inBody(x, y) || !bareAt(x, y)) continue;
      if (!bareAt(x, y + 1) && inBody(x, y + 1)) put(x, y, CLOTH[4]);
    }
  }

  return PNG.sync.write(png);
}

mkdirSync("assets/portrait/Shoulders", { recursive: true });
for (const style of STYLES) {
  writeFileSync(`assets/portrait/Shoulders/${style.id}.png`, draw(style));
}
console.log(`wrote ${STYLES.length} shoulder cells at ${FRAME}x${FRAME}`);
