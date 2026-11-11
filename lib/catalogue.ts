/** The creature editor's changes, laid over the catalogue built into the app (lib/historikals.ts).
 *
 *  The database (badge_kinds) is where an edit lands. On the server, getCatalogue (lib/data.ts) reads it and
 *  works out which creatures differ from the built-in catalogue; those patches are applied here on the server,
 *  and handed to the browser by <CatalogueSync>, so a rename, a retype or new moves show everywhere at once
 *  without a new build. Only creatures that differ travel, so the page stays small. */
import { HISTORIKALS, type Element, type Move, type Rarity } from "@/lib/historikals";

export type CreaturePatch = {
  slug: string; name: string; rarity: Rarity; types: Element[]; hearts: number; moves: Move[];
  retired: boolean; hover: boolean; rnd: boolean; shift: boolean;
};
export type CatalogueRow = {
  slug: string; title: string; rarity: Rarity; types: Element[] | null; hearts: number | null; moves: Move[] | null;
  droppable: boolean; hover: boolean; rnd: boolean; shift: boolean;
};

const fields = (h: (typeof HISTORIKALS)[number]) => ({
  name: h.name, rarity: h.rarity, types: [...h.types], hearts: h.hearts, moves: h.moves.map((m) => ({ ...m })),
  retired: !!h.retired, hover: !!h.hover, rnd: !!h.rnd, shift: !!h.shift,
});
/** Each creature as built, before any patch: what a patch is measured against, and what it falls back to. */
const BUILT = new Map(HISTORIKALS.map((h) => [h.slug, fields(h)]));

/** "MR. GHOST SR." as "Mr. Ghost Sr.": the database keeps names in capitals. */
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s\-'(./])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The creatures whose database row differs from the built-in catalogue. */
export function patchesFrom(rows: CatalogueRow[]): CreaturePatch[] {
  const out: CreaturePatch[] = [];
  for (const r of rows) {
    const b = BUILT.get(r.slug);
    if (!b || !r.types?.length || !r.hearts || !r.moves) continue;
    const p: CreaturePatch = {
      slug: r.slug, name: r.title.toUpperCase() === b.name.toUpperCase() ? b.name : titleCase(r.title), rarity: r.rarity, types: r.types,
      hearts: r.hearts, moves: r.moves.map((m) => ({ name: m.name, kind: m.kind, el: m.el ?? [], ...(m.charge ? { charge: true } : {}) })), retired: !r.droppable, hover: r.hover, rnd: r.rnd, shift: r.shift,
    };
    const { slug: _s, ...rest } = p;
    if (!same(rest, b)) out.push(p);
  }
  return out;
}

/** Lay these patches over the catalogue, every other creature back as built (so undoing an edit undoes it here too). */
export function applyPatches(patches: CreaturePatch[]) {
  const by = new Map(patches.map((p) => [p.slug, p]));
  for (const h of HISTORIKALS) {
    const p = by.get(h.slug);
    const f = p ? { ...p } : BUILT.get(h.slug);
    if (!f) continue;
    h.name = f.name; h.rarity = f.rarity; h.types = f.types; h.hearts = f.hearts; h.moves = f.moves;
    h.retired = f.retired || undefined; h.hover = f.hover || undefined; h.rnd = f.rnd || undefined; h.shift = f.shift || undefined;
  }
}
