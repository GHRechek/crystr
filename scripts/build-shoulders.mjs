// Draws assets/portrait/Shoulders/NN.png — the body the Portrait Maker sheets
// never shipped. All 26 jaws end identically, mid-neck, at x 60..71 / y 111:
// an attachment point and nothing else. Without something below it, every
// portrait is a head floating on a colour.
//
// These cells are the full composed frame (144x144), not 128x128 sheet cells,
// because the shoulders run past the edge of the original art. The compositor
// tells them apart by size.
//
// Drawn in the sheets' own source palette: the neck and any bare chest use the
// skin steps, the garment its own five, so all of it recolours through the
// same replace table as a face does.
//
// Run: node scripts/build-shoulders.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const W = 144;
const H = 144;

/** Where the head lands in this frame. Every jaw's neck is x 64..83 on its
 *  second-to-last row and tapers to 70..81 on the last; the body's neck must
 *  match the wider row exactly so that taper reads as the jaw's edge, not as
 *  a notch, and nothing pokes out beside it. */
const NECK_CX = 74;
const NECK_HALF = 10;
const JAW_BOTTOM = 115;
const BODY_CX = 72;
/** Top of the shoulders at the neck, and how far out they reach. */
const NECK_BASE = 122;
const REACH = 70;

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
  const t = clamp((dx - 11) / REACH);
  if (dx <= 11) return NECK_BASE;
  return NECK_BASE + 11 * Math.sqrt(t) + 5 * t ** 3;
}

function inBody(x, y) {
  const dx = Math.abs(x - BODY_CX);
  if (dx > 74) return false;
  return y >= shoulderTop(dx);
}

/** The neck: exactly the jaw's width until it clears the jaw, then widening
 *  into the trapezius. Jaws draws over everything above JAW_BOTTOM. */
function neckHalf(y) {
  return NECK_HALF + clamp((y - JAW_BOTTOM - 2) / (NECK_BASE + 4 - JAW_BOTTOM)) * 5;
}
function inNeck(x, y) {
  return y >= 96 && y <= NECK_BASE + 6 && Math.abs(x - NECK_CX) <= neckHalf(y);
}

// -------------------------------------------------------------- necklines
//
// True where skin shows instead of cloth.

const NECKLINES = {
  crew: (x, y) => ((x - NECK_CX) / 21) ** 2 + ((y - 114) / 14) ** 2 < 1,
  scoop: (x, y) => ((x - NECK_CX) / 27) ** 2 + ((y - 112) / 22) ** 2 < 1,
  vee: (x, y) => Math.abs(x - NECK_CX) < 25 && y < 118 + (25 - Math.abs(x - NECK_CX)) * 1.2,
};

/** Three plain necklines. There were eight — bare, collar, turtleneck, tank
 *  and hood went; a shirt here is a colour and a neckline, not a costume. */
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
  const dx = (x - BODY_CX) / 74;
  const below = (y - shoulderTop(Math.abs(x - BODY_CX))) / 30;
  let l = 0.74 - dx * 0.26 - clamp(below, 0, 2) * 0.2;

  // The head's shadow, softened so its edge isn't a visible disc.
  const cast = Math.hypot((x - NECK_CX) / 1.45, (y - 112) / 1.0) / 30;
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

function draw(style) {
  const png = new PNG({ width: W, height: H });
  png.data.fill(0);

  const put = (x, y, hex) => {
    const i = (y * W + x) * 4;
    const [r, g, b] = rgb(hex);
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = 255;
  };

  const bareAt = NECKLINES[style.neckline];

  for (let y = 96; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const body = inBody(x, y);
      const neck = inNeck(x, y);
      if (!body && !neck) continue;

      if (!neck || !body) {
        if (!body) {
          // Bare neck between the jaw and the shoulder line. Continue what
          // the jaw drew: flat base, with the shadow it carries down its
          // right side.
          const d = x - NECK_CX;
          put(x, y, d > 7 ? SKIN[3] : d > 4 ? SKIN[2] : SKIN[1]);
          continue;
        }
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
  for (let y = 96; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
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
console.log(`wrote ${STYLES.length} shoulder cells`);
