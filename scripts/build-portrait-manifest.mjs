// Scans assets/portrait and writes lib/portrait/manifest.ts.
// Run after changing the art: `node scripts/build-portrait-manifest.mjs`.
//
// The source is fifteen 128x128 sprite sheets on a 6-wide grid. Cells line up
// by grid position ACROSS sheets: HairBack/07 is the back of the same
// hairstyle as HairFront/07, EarsBack/03 belongs to EarsFront/03, pupils/12
// go in eyes/12. Those are grouped here into single choices that draw all of
// their pieces.
//
// The original tool's MISC control paired the same way — index N from the
// skin-marks sheet AND index N from the worn-things sheet — which is how you
// got antlers welded to an eye scar and an eyepatch welded to freckles. Here
// those sheets are read cell by cell and sorted into their own controls, so
// horns, scars, glasses, blemishes and jewellery are chosen separately.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "assets/portrait";

const idx = (dir) =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir))
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/, ""))
        .sort()
    : [];

const has = (dir, i) => existsSync(join(ROOT, dir, `${i}.png`));

/** Controls whose options line up by grid index across one or more sheets. */
const GROUPS = {
  // key        lead sheet (defines the options)  companions drawn with it
  jaw: { lead: "Jaws", also: [] },
  ears: { lead: "EarsFront", also: ["EarsBack"] },
  eyes: { lead: "Eyes", also: ["pupils"] },
  eyebrows: { lead: "Eyebrows", also: [] },
  nose: { lead: "Noses", also: [] },
  mouth: { lead: "Mouths", also: [] },
  beard: { lead: "Beards", also: [] },
  // Hair is two controls, not one: the sides of the head and the top of it.
  // scripts/build-hair-crown.mjs cuts every back cell along the skull's
  // curve into HairSides (what hangs beside and below) and HairCrown (the
  // top); the top of a style is that plus its HairFront cell, the hairline
  // and fringe, paired by index as drawn. Which tops sit on which sides
  // without a seam is decided there too. The tool paired all of it by
  // index; the builder still steps them together until you split them.
  hair_back: { lead: "HairSides", also: [] },
  top: { lead: "HairCrown", also: ["HairFront"] },
};

/** sides id -> the top ids that sit on it cleanly (its own first); "none"
 *  is the tops that sit on a shaved head. */
const TOPS = JSON.parse(readFileSync(join(ROOT, "_crown-pairs.json"), "utf8"));

/** Earrings hang from the lobe, and the lobe moves with the ear shape, so
 *  scripts/build-earrings.mjs draws one cell per (design, metal, ear). The
 *  option's cell is a template: the compositor fills {ears} from the face. */
const EARRINGS = ["stud", "hoop", "bighoop", "drop", "dangle"].flatMap((design) =>
  ["silver", "gold"].map((metal) => ({
    id: `${design}-${metal}`,
    cells: [`Earrings/${design}-${metal}-{ears}`],
  })),
);

/** Controls built from named cells, one entry per option. Each id is the
 *  cell's grid index on the sheet it came from, so the art stays traceable.
 *  Classified by looking at every cell drawn alone over a plain face. */
const BELOW = "AccessoriesBelowBeard";
const WORN = "LayeredAccessories";
const WORN_BACK = "LayeredAccessoryBack";

const PICKS = {
  scars: [
    { id: "01", cells: [`${BELOW}/01`] }, // burn across the cheek
    { id: "04", cells: [`${BELOW}/04`] }, // cut through the eyebrow, nick below
    { id: "05", cells: [`${BELOW}/05`] }, // two small scars, cheek and brow
    { id: "10", cells: [`${BELOW}/10`] }, // scratch by the mouth
    { id: "11", cells: [`${BELOW}/11`] }, // scratch across the cheek
  ],
  blemishes: [
    { id: "03", cells: [`${BELOW}/03`] }, // one mole
    { id: "07", cells: [`${BELOW}/07`] }, // two moles
    { id: "02", cells: [`${BELOW}/02`] }, // a few freckles
    { id: "14", cells: [`${BELOW}/14`] }, // freckles on the cheek
    { id: "06", cells: [`${BELOW}/06`] }, // freckles across the face
    { id: "09", cells: [`${BELOW}/09`] }, // heavy freckles
    { id: "13", cells: [`${BELOW}/13`] }, // acne
    { id: "08", cells: [`${BELOW}/08`] }, // forehead lines
  ],
  horns: [
    { id: "05", cells: [`${WORN}/05`, `${WORN_BACK}/05`] }, // horns
    { id: "04", cells: [`${WORN}/04`, `${WORN_BACK}/04`] }, // antlers
  ],
  eyewear: [
    { id: "03", cells: [`${WORN}/03`] }, // round spectacles
    { id: "11", cells: [`${WORN}/11`] }, // spectacles
    { id: "10", cells: [`${WORN}/10`] }, // thin frames
    { id: "07", cells: [`${WORN}/07`] }, // round dark lenses
    { id: "06", cells: [`${WORN}/06`] }, // sunglasses
    { id: "08", cells: [`${WORN}/08`] }, // monocle on a chain
    { id: "09", cells: [`${WORN}/09`] }, // eyepatch
  ],
  jewellery: [
    { id: "01", cells: [`${WORN}/01`] }, // nose ring
    { id: "02", cells: [`${WORN}/02`] }, // eyebrow piercing
    { id: "12", cells: [`${BELOW}/12`] }, // bindi
  ],
};

const manifest = {};
for (const [key, { lead, also }] of Object.entries(GROUPS)) {
  manifest[key] = idx(lead).map((i) => ({
    id: i,
    cells: [lead, ...also].filter((d) => has(d, i)).map((d) => `${d}/${i}`),
  }));
}
for (const [key, options] of Object.entries(PICKS)) {
  for (const o of options) {
    for (const c of o.cells) {
      if (!existsSync(join(ROOT, `${c}.png`))) throw new Error(`${key}/${o.id}: no such cell ${c}`);
    }
  }
  manifest[key] = options;
}
/** Eyeshadow is a tint on the lid, and the lid moves with the eye shape, so
 *  scripts/build-eyeshadow.mjs draws one cell per (colour, eyes). */
const EYESHADOW = ["smoky", "violet", "blue", "gold", "green", "rose"].map((colour) => ({
  id: colour,
  cells: [`Eyeshadow/${colour}-{eyes}`],
}));

// Templated cells are checked against every value of the control they follow.
const checkTemplated = (key, options, token, dir) => {
  for (const o of options) {
    for (const v of idx(dir)) {
      const c = o.cells[0].replace(`{${token}}`, v);
      if (!existsSync(join(ROOT, `${c}.png`))) throw new Error(`${key}/${o.id}: no such cell ${c}`);
    }
  }
  manifest[key] = options;
};
checkTemplated("earrings", EARRINGS, "ears", "EarsFront");
checkTemplated("eyeshadow", EYESHADOW, "eyes", "Eyes");
// A second jewellery slot draws from the same cells, so a face can wear two.
manifest.jewellery2 = manifest.jewellery;

const body = `// GENERATED by scripts/build-portrait-manifest.mjs — do not edit by hand.

export type PortraitOption = {
  /** The cell's grid index on the sheet it came from. */
  id: string;
  /** Every cell this option draws, as sheet/index. Order is decided by the
   *  compositor's sheet order, not by this list. A cell may carry a {key}
   *  token, filled from the face's own choice for that control. */
  cells: string[];
};

export const OPTIONS: Record<string, PortraitOption[]> = ${JSON.stringify(manifest, null, 2)};

/** For each hair back (the sides), the tops that sit on it without a seam —
 *  its own first; "none" is the tops that sit on a shaved head. Decided by
 *  scripts/build-hair-crown.mjs. */
export const TOPS: Record<string, string[]> = ${JSON.stringify(TOPS)};
`;

writeFileSync("lib/portrait/manifest.ts", body);
console.log(
  Object.entries(manifest)
    .map(([k, v]) => `${k}: ${v.length}`)
    .join("  "),
);
