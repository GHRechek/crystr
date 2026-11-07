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

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

/** How far the sides may stick out from under the top along the visible
 *  seam, in boundary pixels where the sides have hair and the top above
 *  them doesn't — a shelf. The other way round, hair above that ends at the
 *  cut with nothing below, is a high fade at this row and reads as one, so
 *  it isn't counted: a short top sits on the curly sides that are a few
 *  curls at the nape, and on no sides at all. */
const MAX_SHELF = Number(process.env.MAX_SHELF ?? Infinity);
/** ...unless that ending is well out from the head. The skull's edge is at
 *  x 37 on the cut row; hair that stops at the cut more than 7px outside it
 *  isn't a fade, it's a slab hanging in the air — the big dome and the
 *  messy bun over a short side. Counted in boundary pixels past x 30 on
 *  the left and 86 on the right. */
const MAX_AIR = Number(process.env.MAX_AIR ?? Infinity);
const AIR = [30, 86];

/** Styles left out of the builder. 07 was the receding hairline, cut. */
const EXCLUDE = ["07"];
/** The shading across the seam is reported (--matrix) but no longer decides
 *  anything: every face is recoloured to its own hair colour, and at the size
 *  faces are shown the jump between two styles' painted shading doesn't read.
 *  The silhouette limits were 3px, then 12px, and both blocked combinations
 *  that looked fine: checked by eye across the whole sides x tops grid with
 *  no limit at all, every pair reads as a hairstyle. So by default nothing is
 *  ruled out; set MAX_SHELF / MAX_AIR to bring a limit back. */

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

/** The front sheet is cut by columns, not rows: a lock is one strand from the
 *  hairline to its tip, and cutting it anywhere leaves a notch where another
 *  style's hair meets it. A column whose hair hangs past LOCK (below the eyes)
 *  is a lock, the whole of it the sides'; a column that stops above is fringe,
 *  the top's. */
const LOCK = 60;
const MIN_LOCK = 3;
const frontSidesOf = (png) => {
  const lock = new Set();
  for (let x = 0; x < SIZE; x++) for (let y = LOCK; y < SIZE; y++) if (opaque(png, x, y)) { lock.add(x); break; }
  // A wisp a pixel or two wide is part of the fringe, not a lock: alone on
  // another top it reads as a stray line down the forehead.
  for (let x = 0; x < SIZE; x++) {
    if (!lock.has(x) || lock.has(x - 1)) continue;
    let w = 0;
    while (lock.has(x + w)) w++;
    if (w < MIN_LOCK) for (let k = 0; k < w; k++) lock.delete(x + k);
  }
  // A lock tapers: its edge columns stop short of LOCK. Take in the columns
  // beside it that still hang below the skull's curve, or the taper stays
  // behind with the top as a thin line.
  const hangs = (x) => { for (let y = MID; y < SIZE; y++) if (opaque(png, x, y)) return true; return false; };
  for (const x of [...lock]) {
    for (let d = -1; !lock.has(x + d) && hangs(x + d); d--) lock.add(x + d);
    for (let d = 1; !lock.has(x + d) && hangs(x + d); d++) lock.add(x + d);
  }
  return (x) => lock.has(x);
};

function split(png, sidesAt = isSides) {
  const top = new PNG({ width: SIZE, height: SIZE });
  const sides = new PNG({ width: SIZE, height: SIZE });
  top.data.fill(0);
  sides.data.fill(0);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = at(png, x, y);
      if (!png.data[i + 3]) continue;
      (sidesAt(x, y) ? sides : top).data.set(png.data.subarray(i, i + 4), i);
    }
  }
  return { top, sides };
}

/** Shelf, air and shade jump between a top and a sides along the visible
 *  seam. */
function seam(top, sides) {
  let shelf = 0, air = 0, both = 0, shade = 0;
  for (const [t, s] of VISIBLE) {
    const a = opaque(top, ...t), b = opaque(sides, ...s);
    if (b && !a) shelf++;
    else if (a && !b && t[1] === MID - 1 && (t[0] < AIR[0] || t[0] > AIR[1])) air++;
    else if (a && b) { both++; shade += Math.abs(lum(top, ...t) - lum(sides, ...s)); }
  }
  return { shelf, air, shade: both ? shade / both : 0 };
}

mkdirSync(`${ROOT}/HairCrown`, { recursive: true });
mkdirSync(`${ROOT}/HairSides`, { recursive: true });
mkdirSync(`${ROOT}/HairFrontTop`, { recursive: true });
mkdirSync(`${ROOT}/HairFrontSides`, { recursive: true });

const ids = readdirSync(`${ROOT}/HairBack`)
  .filter((f) => f.endsWith(".png"))
  .map((f) => f.replace(/\.png$/, ""))
  .filter((id) => !EXCLUDE.includes(id))
  .sort();
/** The updo's strands, shorter: everything ends at the top of the mouth, the
 *  strand by the ear goes (the hair there curves in to a soft point instead),
 *  the front strand ends in a point, and the far side's outer strand keeps its
 *  own curl down to its tip. Applied to the sides and the front locks alike;
 *  orig is the cell as it was, for what is kept. */
const MOUTH = 86;
const shortStrands = (png, orig) => {
  const on = (x, y) => png.data[at(png, x, y) + 3] > 0;
  for (let y = MOUTH; y < SIZE; y++) for (let x = 0; x < SIZE; x++) png.data[at(png, x, y) + 3] = 0;
  for (let y = 72; y < SIZE; y++) for (let x = 44; x < 53; x++) png.data[at(png, x, y) + 3] = 0;
  // over rows y0..y1 each run narrows a pixel a row, to its middle: a point
  const point = (y0, y1, x0, x1) => {
    for (let y = y0; y < y1; y++) {
      let x = x0;
      while (x < x1) {
        if (!on(x, y)) { x++; continue; }
        let w = 0;
        while (x + w < x1 && on(x + w, y)) w++;
        const keep = Math.max(1, w - (y - y0 + 1)), start = x + Math.floor((w - keep) / 2);
        for (let k = 0; k < w; k++) if (x + k < start || x + k >= start + keep) png.data[at(png, x + k, y) + 3] = 0;
        x += w;
      }
    }
  };
  point(68, 72, 44, 53);
  point(MOUTH - 4, MOUTH, 53, 88);
  for (let y = MOUTH - 4; y < SIZE; y++) for (let x = 88; x < SIZE; x++) { const i = at(png, x, y); png.data.set(orig.data.subarray(i, i + 4), i); }
};

/** Extra sides made from an artist's style, with no top of their own: id ->
 *  the style and what is done to it — trimmed as TRIMS below ({ minX, cut }),
 *  or redrawn by edit(png, orig), applied to its sides and front locks. */
const VARIANTS = {
  "28": { from: "08", edit: shortStrands },
};

/** Styles redrawn shorter at the back of the head (x < CORE[0]). The updo
 *  (08) hung a mass of hair behind the head and a tail behind the ear; both
 *  are trimmed, and the bun's top tapers in to meet them. Sides: hair may
 *  reach back to minX (rounded off toward the crown) and stops at row cut.
 *  Top: from row crownFrom down to the cut, the back edge narrows from crownX
 *  to sidesX. New edges take the style's darkest shade as an outline. */
const TRIMS = {
  "08": { minX: 30, cut: 82, crownFrom: 30, crownX: 29, sidesX: 32 },
};
const OUTLINE = [50, 35, 29, 255];
const outlineBack = (png) => {
  const edge = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < CORE[0]; x++) {
    if (opaque(png, x, y) && (!opaque(png, x - 1, y) || !opaque(png, x, y + 1))) edge.push([x, y]);
  }
  for (const [x, y] of edge) png.data.set(OUTLINE, at(png, x, y));
};
const trimSides = (png, { minX, cut: tail }) => {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < CORE[0]; x++) {
    if (y >= tail || x < minX + Math.max(0, Math.round((52 - y) / 3))) png.data[at(png, x, y) + 3] = 0;
  }
};
const sideIds = [...ids, ...Object.keys(VARIANTS)];
for (const dir of ["HairCrown", "HairSides", "HairFrontTop", "HairFrontSides"]) {
  const keep = dir === "HairSides" || dir === "HairFrontSides" ? sideIds : ids;
  for (const f of readdirSync(`${ROOT}/${dir}`)) if (!keep.includes(f.replace(/\.png$/, ""))) rmSync(`${ROOT}/${dir}/${f}`);
}
const cut = {};
for (const id of ids) {
  cut[id] = split(read(`HairBack/${id}`));
  const trim = TRIMS[id];
  if (trim) {
    trimSides(cut[id].sides, trim);
    outlineBack(cut[id].sides);
    const { crownFrom, crownX, sidesX } = trim;
    let touched = false;
    for (let y = crownFrom; y < MID; y++) {
      const edge = Math.round(crownX + ((sidesX - crownX) * (y - crownFrom)) / (MID - 1 - crownFrom));
      for (let x = 0; x < edge; x++) if (opaque(cut[id].top, x, y)) { cut[id].top.data[at(cut[id].top, x, y) + 3] = 0; touched = true; }
    }
    if (touched) {
      // outline only the rows that were cut, so the bun keeps its own edge
      const edge = [];
      for (let y = crownFrom; y < MID; y++) for (let x = 0; x < CORE[0]; x++) if (opaque(cut[id].top, x, y) && !opaque(cut[id].top, x - 1, y)) edge.push([x, y]);
      for (const [x, y] of edge) cut[id].top.data.set(OUTLINE, at(cut[id].top, x, y));
    }
  }
  writeFileSync(`${ROOT}/HairCrown/${id}.png`, PNG.sync.write(cut[id].top));
  writeFileSync(`${ROOT}/HairSides/${id}.png`, PNG.sync.write(cut[id].sides));
  // The front sheet (drawn over the face), cut into locks and fringe. The fringe is
  // the top's; the long locks that hang in front — the straight styles carry
  // hundreds of pixels of them — go with the sides, so a long top on short
  // sides doesn't leave locks floating, and long sides keep theirs.
  const frontPng = read(`HairFront/${id}`);
  const isLock = frontSidesOf(frontPng);
  const front = split(frontPng, (x) => isLock(x));
  // Over the forehead and temples the top keeps its locks too, down to LOCK:
  // the face is drawn over the scalp and crown, so only front hair covers the
  // hairline, and a top that gave its locks up left bare skin there under
  // another style's sides. Mixed, both are drawn; matched, the compositor
  // draws the original front cell instead, so a style still adds up exactly.
  for (let y = 0; y < LOCK; y++) for (let x = 0; x < SIZE; x++) {
    const i = at(frontPng, x, y);
    if (frontPng.data[i + 3] && isLock(x)) front.top.data.set(frontPng.data.subarray(i, i + 4), i);
  }
  writeFileSync(`${ROOT}/HairFrontTop/${id}.png`, PNG.sync.write(front.top));
  writeFileSync(`${ROOT}/HairFrontSides/${id}.png`, PNG.sync.write(front.sides));
}

// The trimmed sides: the back of the head only (x < CORE[0]) is cut, and the
// new edge gets the style's own darkest shade as an outline.
for (const [id, { from, minX, cut: tail, edit }] of Object.entries(VARIANTS)) {
  const copy = (png) => PNG.sync.read(PNG.sync.write(png));
  const sides = copy(cut[from].sides);
  const frontOrig = read(`HairFrontSides/${from}`);
  const front = copy(frontOrig);
  if (minX !== undefined) { trimSides(sides, { minX, cut: tail }); outlineBack(sides); }
  if (edit) { edit(sides, cut[from].sides); edit(front, frontOrig); }
  cut[id] = { top: cut[from].top, sides };
  writeFileSync(`${ROOT}/HairSides/${id}.png`, PNG.sync.write(sides));
  writeFileSync(`${ROOT}/HairFrontSides/${id}.png`, PNG.sync.write(front));
}
writeFileSync(`${ROOT}/_sides-own.json`, JSON.stringify(Object.fromEntries(Object.entries(VARIANTS).map(([id, v]) => [id, v.from]))) + "\n");

const fits = ({ shelf, air }) => shelf <= MAX_SHELF && air <= MAX_AIR;

// The hair base: a rim around the skull, BASE px at the crown, narrowing to
// nothing just above the ear (no straight cut), in a hair shade a step darker
// than the main tone so it reads as hair in shadow. Drawn under every style
// that has hair, it rounds the head out and fills the gaps between a mixed
// top and sides. Bald heads don't get it, so a skull keeps its own shape.
{
  const BASE = 4, FULL_TO = 48, GONE_AT = 64;
  const skull = read("Cranium/00");
  const base = new PNG({ width: SIZE, height: SIZE });
  base.data.fill(0);
  for (let y = 0; y < SIZE; y++) {
    const k = y <= FULL_TO ? BASE : y >= GONE_AT ? 0 : (BASE * (GONE_AT - y)) / (GONE_AT - FULL_TO);
    for (let x = 0; x < SIZE; x++) {
      if (opaque(skull, x, y)) continue;
      let hit = false;
      for (let dy = -BASE; dy <= BASE && !hit; dy++) for (let dx = -BASE; dx <= BASE && !hit; dx++) if (dx * dx + dy * dy <= k * k + 0.5 && opaque(skull, x + dx, y + dy)) hit = true;
      if (hit) base.data.set([0x58, 0x39, 0x1a, 255], at(base, x, y));
    }
  }
  mkdirSync(`${ROOT}/HairBase`, { recursive: true });
  writeFileSync(`${ROOT}/HairBase/00.png`, PNG.sync.write(base));
}

// sides id -> the top ids that sit on it cleanly, its own first. "none" is
// no sides: the tops that can sit on a shaved head.
const pairs = {};
let extra = 0;
for (const s of sideIds) {
  const own = VARIANTS[s]?.from ?? s;
  pairs[s] = [own];
  for (const t of ids) {
    if (t === own) continue;
    if (fits(seam(cut[t].top, cut[s].sides))) { pairs[s].push(t); extra++; }
  }
}
const bare = new PNG({ width: SIZE, height: SIZE });
bare.data.fill(0);
pairs.none = ids.filter((t) => fits(seam(cut[t].top, bare)));
writeFileSync(`${ROOT}/_crown-pairs.json`, JSON.stringify(pairs, null, 2) + "\n");

// sides id -> every other sides, most alike first (overlap of their shapes), so
// the builder can find the nearest sides that will take a top you picked.
// "none" lists them smallest first.
const mask = (png) => { const m = new Uint8Array(SIZE * SIZE); for (let i = 0; i < m.length; i++) m[i] = png.data[i * 4 + 3] > 0 ? 1 : 0; return m; };
const masks = Object.fromEntries(sideIds.map((id) => [id, mask(cut[id].sides)]));
const area = (m) => m.reduce((n, v) => n + v, 0);
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return u ? i / u : 1; };
const near = { none: [...sideIds].sort((a, b) => area(masks[a]) - area(masks[b])) };
for (const s of sideIds) near[s] = sideIds.filter((o) => o !== s).sort((a, b) => iou(masks[s], masks[b]) - iou(masks[s], masks[a]));
writeFileSync(`${ROOT}/_sides-near.json`, JSON.stringify(near) + "\n");

if (process.argv.includes("--matrix")) {
  console.log("sides \\ top: shelf / shade (own pair marked *)");
  for (const s of ids) {
    console.log(s, ids.map((t) => { const r = seam(cut[t].top, cut[s].sides); return `${t === s ? "*" : " "}${String(r.shelf).padStart(2)}/${String(Math.round(r.shade)).padStart(2)}`; }).join(" "));
  }
}
console.log(`cut ${ids.length} styles; ${extra} top/sides pairs beyond the artist's own; ${pairs.none.length} tops on no sides; ${VISIBLE.length} of ${SEAM.length} seam pixels visible`);
