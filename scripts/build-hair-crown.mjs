// Cuts each assets/portrait/HairBack cell into a top and a sides cell —
// HairCrown/NN is the top of the head, HairSides/NN is what hangs beside and
// below it — and works out which tops can sit on which sides without a
// visible seam. Writes assets/portrait/_crown-pairs.json for the manifest.
//
// The back sheet is where the artist put the top, the sides and the length
// all in one painted piece, and the front sheet is the hairline and fringe.
// TOP in the builder is the whole top of the head: the back cell above the
// skull's curve plus the front cell, paired by index as drawn. SIDES is the
// rest of the back cell. The cut is one fixed line for every style: above
// the row where the skull stops curving in is top; below it, everything
// outside the skull's own columns, plus everything under the skull, is
// sides. Top and sides of one style add back up to the original exactly.
//
// Two shapes painted for different silhouettes don't agree along that line,
// so every top is scored against every sides along the cut — the boundary
// pixels the face doesn't cover — and only pairs whose silhouettes meet within
// a few pixels, and whose shading doesn't jump across the line, are allowed.
// A style's own top on its own sides always is. A top is also scored
// against no sides at all, for the shaved-sides look.
//
// Cells are 128x128 sheet-space like everything else. Run after changing
// the hair: node scripts/build-hair-crown.mjs

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const SIZE = 128;
const ROOT = "assets/portrait";

/** The cut. The Cranium cell's left edge curves in above row 46 and runs
 *  straight down from there: above is the top of the head, below is the
 *  side of it. Its columns, 42–70, are behind the face. */
const MID = 46;
const CORE = [42, 70];
const UNDER = 80;
const isSides = (x, y) => y >= UNDER || (y >= MID && (x < CORE[0] || x > CORE[1]));

/** How far apart two silhouettes may be along the visible seam, in boundary
 *  pixels where one has hair and the other doesn't. */
const MAX_STEP = 3;
/** How much the shading may jump across the seam, on average, where both
 *  have hair: mean luminance difference in 0–255. */
const MAX_SHADE = 25;

const read = (p) => PNG.sync.read(readFileSync(`${ROOT}/${p}.png`));
const at = (png, x, y) => (y * SIZE + x) * 4;
const opaque = (png, x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE && png.data[at(png, x, y) + 3] > 0;
const lum = (png, x, y) => {
  const i = at(png, x, y);
  return 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
};

/** Boundary pairs [topPixel, sidesPixel] along the cut, skipping any the
 *  face covers — the seam behind the face is never seen. The face is the
 *  jaw, and the jaws differ, so a pixel counts as covered only if every jaw
 *  covers it. (Not the Cranium: the skull draws under the hair.) */
const cover = (() => {
  const jaws = readdirSync(`${ROOT}/Jaws`).filter((f) => f.endsWith(".png")).map((f) => read(`Jaws/${f.replace(/\.png$/, "")}`));
  const all = new PNG({ width: SIZE, height: SIZE });
  for (let i = 3; i < all.data.length; i += 4) all.data[i] = jaws.every((j) => j.data[i] > 0) ? 255 : 0;
  return all;
})();
const SEAM = [];
for (let x = 0; x < SIZE; x++) {
  if (x >= CORE[0] && x <= CORE[1]) continue;
  SEAM.push([[x, MID - 1], [x, MID]]);
}
for (let y = MID; y < UNDER; y++) {
  SEAM.push([[CORE[0], y], [CORE[0] - 1, y]]);
  SEAM.push([[CORE[1], y], [CORE[1] + 1, y]]);
}
for (let x = CORE[0]; x <= CORE[1]; x++) SEAM.push([[x, UNDER - 1], [x, UNDER]]);
const VISIBLE = SEAM.filter(([t, s]) => !opaque(cover, ...t) && !opaque(cover, ...s));

function split(png) {
  const top = new PNG({ width: SIZE, height: SIZE });
  const sides = new PNG({ width: SIZE, height: SIZE });
  top.data.fill(0);
  sides.data.fill(0);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = at(png, x, y);
      if (!png.data[i + 3]) continue;
      (isSides(x, y) ? sides : top).data.set(png.data.subarray(i, i + 4), i);
    }
  }
  return { top, sides };
}

/** Steps and shade jump between a top and a sides along the visible seam. */
function seam(top, sides) {
  let step = 0, both = 0, shade = 0;
  for (const [t, s] of VISIBLE) {
    const a = opaque(top, ...t), b = opaque(sides, ...s);
    if (a !== b) step++;
    else if (a) { both++; shade += Math.abs(lum(top, ...t) - lum(sides, ...s)); }
  }
  return { step, shade: both ? shade / both : 0 };
}

mkdirSync(`${ROOT}/HairCrown`, { recursive: true });
mkdirSync(`${ROOT}/HairSides`, { recursive: true });

const ids = readdirSync(`${ROOT}/HairBack`).filter((f) => f.endsWith(".png")).map((f) => f.replace(/\.png$/, "")).sort();
const cut = {};
for (const id of ids) {
  cut[id] = split(read(`HairBack/${id}`));
  writeFileSync(`${ROOT}/HairCrown/${id}.png`, PNG.sync.write(cut[id].top));
  writeFileSync(`${ROOT}/HairSides/${id}.png`, PNG.sync.write(cut[id].sides));
}

const fits = ({ step, shade }) => step <= MAX_STEP && shade <= MAX_SHADE;

// sides id -> the top ids that sit on it cleanly, its own first. "none" is
// no sides: the tops that end above the cut and can sit on a shaved head.
const pairs = {};
let extra = 0;
for (const s of ids) {
  pairs[s] = [s];
  for (const t of ids) {
    if (t === s) continue;
    if (fits(seam(cut[t].top, cut[s].sides))) { pairs[s].push(t); extra++; }
  }
}
const bare = new PNG({ width: SIZE, height: SIZE });
bare.data.fill(0);
pairs.none = ids.filter((t) => fits(seam(cut[t].top, bare)));
writeFileSync(`${ROOT}/_crown-pairs.json`, JSON.stringify(pairs, null, 2) + "\n");

if (process.argv.includes("--matrix")) {
  console.log("sides \\ top: step / shade (own pair marked *)");
  for (const s of ids) {
    console.log(s, ids.map((t) => { const r = seam(cut[t].top, cut[s].sides); return `${t === s ? "*" : " "}${String(r.step).padStart(2)}/${String(Math.round(r.shade)).padStart(2)}`; }).join(" "));
  }
}
console.log(`cut ${ids.length} styles; ${extra} top/sides pairs beyond the artist's own; ${pairs.none.length} tops on no sides; ${VISIBLE.length} of ${SEAM.length} seam pixels visible`);
