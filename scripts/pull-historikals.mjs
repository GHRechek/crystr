// Rewrites the HISTORIKALS array in lib/historikals.ts from a dump of the database's badge_kinds (the
// creature editor and the roster updates both land there, so it is the catalogue of record). The dump is
// a JSON array of rows [slug, title, rarity, types, hearts, moves, rnd, shift, hover, droppable, active,
// sort], as scripts/historikals/db-dump.json; a creature that cannot be found any more is kept as retired.
//   node scripts/pull-historikals.mjs scripts/historikals/db-dump.json
import fs from "node:fs";
const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const q = (s) => JSON.stringify(s);
// Names: the database keeps titles in capitals; the roster's own casing is kept where it still matches, and
// a name a witch gave in the editor is cased word by word.
const title = (t) => t.split(" ").map((w) => w.toLowerCase().replace(/(^|[\-.])([a-z])/g, (m, p, c) => p + c.toUpperCase())).join(" ");
const had = new Map([...fs.readFileSync("lib/historikals.ts", "utf8").matchAll(/\{ slug: "([^"]+)", name: "((?:[^"\\]|\\.)*)"/g)].map((m) => [m[1], JSON.parse(`"${m[2]}"`)]));
const nameOf = (slug, t) => (had.get(slug)?.toUpperCase() === t ? had.get(slug) : title(t));
const lines = rows
  .filter((r) => r[10] !== false || r[9] === false)
  .sort((a, b) => a[11] - b[11] || a[0].localeCompare(b[0]))
  .map(([slug, t, rarity, types, hearts, moves, rnd, shift, hover, droppable]) =>
    `  { slug: ${q(slug)}, name: ${q(nameOf(slug, t))}, rarity: ${q(rarity)}, types: [${types.map(q).join(", ")}], hearts: ${hearts}, moves: [${moves.map((m) => `{ name: ${q(m.name)}, kind: ${q(m.kind)}, el: [${(m.el ?? []).map(q).join(", ")}]${m.charge ? ", charge: true" : ""} }`).join(", ")}]${rnd ? ", rnd: true" : ""}${shift ? ", shift: true" : ""}${hover ? ", hover: true" : ""}${droppable ? "" : ", retired: true"} },`);
const p = "lib/historikals.ts";
const src = fs.readFileSync(p, "utf8");
const a = src.indexOf("export const HISTORIKALS: Historikal[] = [\n") + "export const HISTORIKALS: Historikal[] = [\n".length;
const b = src.indexOf("\n];", a);
fs.writeFileSync(p, src.slice(0, a) + lines.join("\n") + src.slice(b));
console.log(`${lines.length} creatures written`);
