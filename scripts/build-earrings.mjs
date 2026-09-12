// Draws assets/portrait/Earrings/<design>-<metal>-<ear>.png — an earring on
// the lobe of each of the 14 near-ear shapes, so the compositor can pick the
// cell that matches the ear a face is wearing.
//
// Five designs in two metals, in the same three tones the sheets' own nose
// ring and brow ring use (silver) plus a gold set. Each is a handful of
// pixels: at this scale there is nothing to shade, only a highlight on the
// top-left and a dark edge on the bottom-right, which is how the sheets draw
// metal too. The lobe is found on each ear cell: its lowest opaque row.
//
// Cells are 128x128 sheet-space like everything else. Run after changing
// the ears: node scripts/build-earrings.mjs

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const SIZE = 128;

/** Light / mid / dark. Silver is the sheets' own metal. */
const METALS = {
  silver: ["#e2e6f4", "#95a0bc", "#2f374f"],
  gold: ["#f0d98a", "#c9a24a", "#7a5c1e"],
};

/** Pixels as [dx, dy, tone] from the lobe's lowest point. */
const DESIGNS = {
  stud: [[0, -1, 0], [-1, 0, 1], [0, 0, 1], [1, 0, 2]],
  hoop: [[-1, 1, 0], [0, 1, 0], [1, 1, 1], [-2, 2, 1], [2, 2, 1], [-2, 3, 1], [2, 3, 2], [-1, 4, 1], [0, 4, 2], [1, 4, 2]],
  bighoop: [
    [-1, 1, 0], [0, 1, 0], [1, 1, 0], [2, 1, 1], [-2, 2, 1], [3, 2, 1], [-3, 3, 1], [3, 3, 1],
    [-3, 4, 1], [3, 4, 2], [-3, 5, 1], [3, 5, 2], [-2, 6, 1], [2, 6, 2], [-1, 7, 2], [0, 7, 2], [1, 7, 2],
  ],
  drop: [[0, 0, 1], [0, 1, 1], [0, 2, 1], [0, 3, 0], [-1, 4, 1], [0, 4, 0], [1, 4, 2], [0, 5, 2]],
  dangle: [[0, 0, 1], [0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [-1, 5, 0], [0, 5, 1], [1, 5, 2], [-1, 6, 1], [0, 6, 2], [1, 6, 2]],
};

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** The lowest opaque row of an ear cell, and the centre of it. */
function lobe(png) {
  for (let y = SIZE - 1; y >= 0; y--) {
    const xs = [];
    for (let x = 0; x < SIZE; x++) if (png.data[(y * SIZE + x) * 4 + 3] > 0) xs.push(x);
    if (xs.length) return { x: Math.floor((xs[0] + xs[xs.length - 1]) / 2), y };
  }
  return null;
}

mkdirSync("assets/portrait/Earrings", { recursive: true });
const ears = readdirSync("assets/portrait/EarsFront").filter((f) => f.endsWith(".png"));
let n = 0;
for (const file of ears) {
  const ear = file.replace(/\.png$/, "");
  const at = lobe(PNG.sync.read(readFileSync(`assets/portrait/EarsFront/${file}`)));
  if (!at) continue;
  for (const [design, px] of Object.entries(DESIGNS)) {
    for (const [metal, tones] of Object.entries(METALS)) {
      const png = new PNG({ width: SIZE, height: SIZE });
      png.data.fill(0);
      for (const [dx, dy, t] of px) {
        const x = at.x + dx, y = at.y + dy;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
        const [r, g, b] = rgb(tones[t]);
        const i = (y * SIZE + x) * 4;
        png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
      }
      writeFileSync(`assets/portrait/Earrings/${design}-${metal}-${ear}.png`, PNG.sync.write(png));
      n++;
    }
  }
}
console.log(`wrote ${n} earring cells for ${ears.length} ears`);
