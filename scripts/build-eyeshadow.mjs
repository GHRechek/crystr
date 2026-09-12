// Draws assets/portrait/Eyeshadow/<colour>-<eyes>.png — a tint on the upper
// lid for each of the 26 eye shapes, so the compositor can pick the cell
// that matches the eyes a face is wearing.
//
// The lid is found on each Eyes cell: per column, the topmost dark pixel is
// the lash line, and the shadow is the four rows above it, strongest at the
// lashes and fading up. It's a translucent tint rather than opaque pixels,
// so it sits on whatever skin is underneath and the lid's own shading shows
// through — which is what eyeshadow does. Brows and hair draw over it.
//
// Cells are 128x128 sheet-space like everything else. Run after changing
// the eyes: node scripts/build-eyeshadow.mjs

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const SIZE = 128;

const COLOURS = {
  smoky: "#3a2a3a",
  violet: "#7b4bb7",
  blue: "#3f7fb8",
  gold: "#c9a24a",
  green: "#2f8a6a",
  rose: "#c95b8a",
};

/** Alpha per row above the lash line, nearest first. */
const ROWS = [140, 140, 84, 42];

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Per column, the topmost dark pixel: the upper lash line. -1 where none. */
function lashLine(png) {
  const top = new Array(SIZE).fill(-1);
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const i = (y * SIZE + x) * 4;
      if (png.data[i + 3] && png.data[i] < 70 && png.data[i + 1] < 70 && png.data[i + 2] < 70) {
        top[x] = y;
        break;
      }
    }
  }
  return top;
}

mkdirSync("assets/portrait/Eyeshadow", { recursive: true });
const eyes = readdirSync("assets/portrait/Eyes").filter((f) => f.endsWith(".png"));
let n = 0;
for (const file of eyes) {
  const id = file.replace(/\.png$/, "");
  const top = lashLine(PNG.sync.read(readFileSync(`assets/portrait/Eyes/${file}`)));
  for (const [name, hex] of Object.entries(COLOURS)) {
    const [r, g, b] = rgb(hex);
    const png = new PNG({ width: SIZE, height: SIZE });
    png.data.fill(0);
    for (let x = 0; x < SIZE; x++) {
      if (top[x] < 0) continue;
      ROWS.forEach((a, k) => {
        const y = top[x] - 1 - k;
        if (y < 0) return;
        const i = (y * SIZE + x) * 4;
        png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = a;
      });
    }
    writeFileSync(`assets/portrait/Eyeshadow/${name}-${id}.png`, PNG.sync.write(png));
    n++;
  }
}
console.log(`wrote ${n} eyeshadow cells for ${eyes.length} eye shapes`);
