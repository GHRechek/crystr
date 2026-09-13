// Draws locs versions of a few of the artist's styles — assets/portrait/
// HairBack/NNl.png and HairFront/NNl.png — as new styles beside the
// originals. Run before scripts/build-hair-crown.mjs, which cuts them into
// top and sides like any other back cell.
//
// Nothing is drawn from scratch: every pixel keeps the artist's outline and
// its place in the shading, and the tone is nudged one palette step in a
// rope pattern — 4px ropes leaning with the hang of the hair, a groove of
// one darker step between them, and a darker twist row every few rows at a
// phase of each rope's own, so the twists don't line up into a weave. Only
// the hair palette is touched and only with hair palette colours, so the
// result recolours with the hair picker like the originals.
//
// Cells are 128x128 sheet-space like everything else. Run after changing
// the hair: node scripts/build-hair-locs.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const SIZE = 128;
const ROOT = "assets/portrait";

/** The styles that take the texture: the buns, the ponytail, the braid. */
const STYLES = ["09", "10", "15", "16"];

/** The hair palette, as in lib/portrait/core.ts. */
const HAIR_SRC = [
  "#fae0c5", "#a58264", "#865c32", "#6d4b29", "#6c4620", "#58391a", "#4e4742",
  "#423024", "#422f23", "#36271d", "#35271d", "#32231d", "#312723", "#291c17",
];
/** The working ramp, dark to light — every one a hair palette colour. */
const TONES = ["#291c17", "#36271d", "#423024", "#58391a", "#6c4620", "#865c32", "#a58264"];

const STRAND = 4; // rope width
const SLANT = 0.25; // ropes lean with the hang of the hair
const KNOT = 7; // rows between twists
const phase = (rope) => ((rope * 2654435761) >>> 0) % KNOT;

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const HAIR = new Set(HAIR_SRC.map((h) => rgb(h).join(",")));
const TL = TONES.map((t) => lum(rgb(t)));
const nearest = (l) => {
  let best = 0;
  for (let i = 1; i < TL.length; i++) if (Math.abs(TL[i] - l) < Math.abs(TL[best] - l)) best = i;
  return best;
};

function locs(png) {
  const out = new PNG({ width: SIZE, height: SIZE });
  out.data.set(png.data);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (!png.data[i + 3]) continue;
      if (!HAIR.has(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`)) continue;
      const t = nearest(lum([png.data[i], png.data[i + 1], png.data[i + 2]]));
      const u = x + SLANT * y;
      const rope = Math.floor(u / STRAND);
      const p = ((Math.floor(u) % STRAND) + STRAND) % STRAND;
      let off = p === 0 ? -1 : 0;
      if ((((y + phase(rope)) % KNOT) + KNOT) % KNOT === 0) off -= 1;
      const [r, g, b] = rgb(TONES[Math.max(0, Math.min(TONES.length - 1, t + off))]);
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
    }
  }
  return out;
}

let n = 0;
for (const id of STYLES) {
  for (const sheet of ["HairBack", "HairFront"]) {
    const src = PNG.sync.read(readFileSync(`${ROOT}/${sheet}/${id}.png`));
    writeFileSync(`${ROOT}/${sheet}/${id}l.png`, PNG.sync.write(locs(src)));
    n++;
  }
}
console.log(`wrote ${n} locs cells for ${STYLES.length} styles`);
