// Cuts each assets/portrait/HairBack cell into a crown and a sides cell —
// HairCrown/NN is the top of the head, HairSides/NN is what hangs beside and
// below it — and works out which crowns can sit on which sides without a
// visible seam. Writes assets/portrait/_crown-pairs.json for the manifest.
//
// The back sheet is where the artist put the crown, the sides and the length
// all in one painted piece (the front sheet is only hairline and fringe), so
// a crown control has to cut it. The cut is one fixed line for every style:
// everything above the skull's midline is crown, and below that everything
// outside the skull's own columns, plus everything under the skull, is sides.
// Crown and sides of one style add back up to the original cell exactly.
//
// Two shapes painted for different silhouettes don't agree along that line,
// so every crown is scored against every sides along the cut — the boundary
// pixels the face doesn't cover — and only pairs whose silhouettes meet within
// a few pixels, and whose shading doesn't jump across the line, are allowed.
// A style's own crown on its own sides always is.
//
// Cells are 128x128 sheet-space like everything else. Run after changing
// the hair: node scripts/build-hair-crown.mjs

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const SIZE = 128;
const ROOT = "assets/portrait";

/** The cut. The Cranium cell spans x 35–76, y 32–80; its midline is 56. */
const MID = 56;
const CORE = [42, 70];
const UNDER = 80;
const isSides = (x, y) => y >= UNDER || (y >= MID && (x < CORE[0] || x > CORE[1]));

/** How far apart two silhouettes may be along the visible seam, in boundary
 *  pixels where one has hair and the other doesn't. */
const MAX_STEP = 3;
/** How much the shading may jump across the seam, on average, where both
 *  have hair: mean luminance difference in 0–255. The artist's own pairs
 *  sit around 20. */
const MAX_SHADE = 34;

/** Styles that are one shape across the cut and the front both, and can't
 *  be split at all: the mohawk's crest runs from the front fin to the back
 *  of the crown, so its crown on any other front is a fin off the back of
 *  the head, and any other crown under its front is a fin on a flat top.
 *  The seam score can't see that — it only looks along the cut. */
const WHOLE = ["12"];

/** The curly styles. A curly crown over straight sides meets in a line the
 *  score can't see either — silhouette and shading both agree along the cut,
 *  but the curls' bumps stop dead where the bob's straight edge starts. The
 *  other way round, a smooth crown over curly ends, reads as a style. So a
 *  curly crown goes on curly sides only. Roughness either side of the cut
 *  was measured and doesn't separate them: the artist's own pairs vary more
 *  across the cut than these do. */
const CURLY = ["23", "24"];

/** Crowns that only sit on their own sides: the slicked-back cuts end in a
 *  straight highlight band along the underside that the artist continued in
 *  those styles' own sides, and on any other sides the band is a hard line
 *  across the temple. Their seam scores the same as the artist's own pairs —
 *  the line is inside the crown, not along the cut. The sides of these
 *  styles still take other crowns. */
const OWN_SIDES_ONLY = ["18", "19"];

const read = (p) => PNG.sync.read(readFileSync(`${ROOT}/${p}.png`));
const at = (png, x, y) => (y * SIZE + x) * 4;
const opaque = (png, x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE && png.data[at(png, x, y) + 3] > 0;
const lum = (png, x, y) => {
  const i = at(png, x, y);
  return 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
};

/** Boundary pairs [crownPixel, sidesPixel] along the cut, skipping any the
 *  face covers — the seam behind the face is never seen. The face is the
 *  jaw, and the jaws differ, so a pixel counts as covered only if every jaw
 *  covers it. (Not the Cranium: the skull draws under the hair, and
 *  treating it as cover hid the cut's vertical edge above the ear.) */
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
const VISIBLE = SEAM.filter(([c, s]) => !opaque(cover, ...c) && !opaque(cover, ...s));

function split(png) {
  const crown = new PNG({ width: SIZE, height: SIZE });
  const sides = new PNG({ width: SIZE, height: SIZE });
  crown.data.fill(0);
  sides.data.fill(0);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = at(png, x, y);
      if (!png.data[i + 3]) continue;
      (isSides(x, y) ? sides : crown).data.set(png.data.subarray(i, i + 4), i);
    }
  }
  return { crown, sides };
}

/** Steps and shade jump between a crown and a sides along the visible seam. */
function seam(crown, sides) {
  let step = 0, both = 0, shade = 0;
  for (const [c, s] of VISIBLE) {
    const a = opaque(crown, ...c), b = opaque(sides, ...s);
    if (a !== b) step++;
    else if (a) { both++; shade += Math.abs(lum(crown, ...c) - lum(sides, ...s)); }
  }
  return { step, shade: both ? shade / both : 0 };
}

mkdirSync(`${ROOT}/HairCrown`, { recursive: true });
mkdirSync(`${ROOT}/HairSides`, { recursive: true });

const ids = readdirSync(`${ROOT}/HairBack`).filter((f) => f.endsWith(".png")).map((f) => f.replace(/\.png$/, "")).sort();
const cut = {};
for (const id of ids) {
  cut[id] = split(read(`HairBack/${id}`));
  writeFileSync(`${ROOT}/HairCrown/${id}.png`, PNG.sync.write(cut[id].crown));
  writeFileSync(`${ROOT}/HairSides/${id}.png`, PNG.sync.write(cut[id].sides));
}

// sides id -> the crown ids that sit on it cleanly, its own first.
const pairs = {};
let extra = 0;
for (const s of ids) {
  pairs[s] = [s];
  for (const c of ids) {
    if (c === s) continue;
    if (WHOLE.includes(c) || WHOLE.includes(s)) continue;
    if (CURLY.includes(c) && !CURLY.includes(s)) continue;
    if (OWN_SIDES_ONLY.includes(c)) continue;
    const { step, shade } = seam(cut[c].crown, cut[s].sides);
    if (step <= MAX_STEP && shade <= MAX_SHADE) { pairs[s].push(c); extra++; }
  }
}
writeFileSync(`${ROOT}/_crown-pairs.json`, JSON.stringify(pairs, null, 2) + "\n");

if (process.argv.includes("--matrix")) {
  console.log("sides \\ crown: step / shade (own pair marked *)");
  for (const s of ids) {
    console.log(s, ids.map((c) => { const r = seam(cut[c].crown, cut[s].sides); return `${c === s ? "*" : " "}${String(r.step).padStart(2)}/${String(Math.round(r.shade)).padStart(2)}`; }).join(" "));
  }
}
console.log(`cut ${ids.length} styles; ${extra} crown/sides pairs beyond the artist's own; ${VISIBLE.length} of ${SEAM.length} seam pixels visible`);
