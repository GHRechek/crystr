// A token: the badge a person designs for themselves and gives away, once every six
// months, for 7 max mana. It is built from parts rather than drawn: a badge shape (a
// circle, a framed circle, a shield, a diamond...) in a colour of their choosing, with a
// rim colour for the framed shapes, and up to two items from the uploaded set, placed by
// dragging, each of which can be flipped, turned, shrunk in steps of fifteen in a hundred,
// and sit over or under the other. The shape is drawn small on purpose, so an item at its
// drawn size already reaches the rim and one dragged outward hangs over it: crossed swords
// with hilts and points past the edge. Everything here is shared by the designer (browser)
// and the compositor (server, lib/token.server.ts); /token/<packed>.png draws one, and the
// packed spec fully describes it.

/** The picture is 32 cells; the badge shape takes the middle 22. */
export const TOKEN_SIZE = 32;

/** The colours a shape and its rim can be. Keys are what is saved. */
export const TOKEN_COLOURS = [
  { key: "gold", label: "Gold", hex: "#f4b43a" },
  { key: "rust", label: "Rust", hex: "#a7542c" },
  { key: "bone", label: "Bone", hex: "#e9dcc3" },
  { key: "steel", label: "Steel", hex: "#8c97a8" },
  { key: "blood", label: "Blood", hex: "#b3202d" },
  { key: "moss", label: "Moss", hex: "#4f7a3a" },
  { key: "mag", label: "Magenta", hex: "#e0398a" },
  { key: "mag-dark", label: "Deep magenta", hex: "#7a2450" },
  { key: "pur", label: "Purple", hex: "#9184d9" },
  { key: "pur-dark", label: "Deep purple", hex: "#5d5294" },
  { key: "blu", label: "Blue", hex: "#4c7df0" },
  { key: "blu-dark", label: "Deep blue", hex: "#3b5aa8" },
  { key: "sea", label: "Sea", hex: "#2f8f8a" },
  { key: "night", label: "Night", hex: "#2a2146" },
  { key: "ink", label: "Ink", hex: "#1b1d29" },
  { key: "slate", label: "Slate", hex: "#3f424d" },
] as const;
export type TokenColour = (typeof TOKEN_COLOURS)[number]["key"];

/** The badge shapes. A framed one has a band in the rim colour just inside its edge. */
export const SHAPES = [
  { key: "circle", label: "Circle", framed: false },
  { key: "circle-frame", label: "Framed circle", framed: true },
  { key: "shield", label: "Shield", framed: false },
  { key: "shield-frame", label: "Framed shield", framed: true },
  { key: "diamond", label: "Diamond", framed: false },
  { key: "diamond-frame", label: "Framed diamond", framed: true },
  { key: "square", label: "Plate", framed: false },
  { key: "square-frame", label: "Framed plate", framed: true },
  { key: "hexagon", label: "Hexagon", framed: false },
  { key: "hexagon-frame", label: "Framed hexagon", framed: true },
] as const;
export type ShapeKey = (typeof SHAPES)[number]["key"];

/** An item's size, in hundredths of how it was drawn: never larger, smaller in steps of fifteen. */
export const SIZES = [55, 70, 85, 100] as const;
export type SizeKey = (typeof SIZES)[number];

/** The badge shape's size, in hundredths of the full one. */
export const BADGE_SIZES = [50, 75, 100] as const;
export type BadgeSize = (typeof BADGE_SIZES)[number];

/** The furthest an item's centre can be packed from the middle, in cells, either way. The
 *  real limit is per item (itemBounds): it must stay wholly inside the picture. */
export const OFFSET_MAX = 16;

/** The items, as files under /badges/items/ (public/badges/items). */
export const ITEMS = [
  { slug: "sword", label: "Sword", w: 16, h: 17 },
  { slug: "longsword", label: "Longsword", w: 16, h: 17 },
  { slug: "medal", label: "Medal", w: 14, h: 17 },
  { slug: "mace", label: "Mace", w: 15, h: 15 },
  { slug: "star", label: "Star", w: 16, h: 15 },
  { slug: "compass", label: "Compass", w: 14, h: 15 },
  { slug: "crown", label: "Crown", w: 16, h: 13 },
  { slug: "gold-coin", label: "Gold coin", w: 14, h: 13 },
  { slug: "coin", label: "Coin", w: 12, h: 13 },
  { slug: "heart", label: "Heart", w: 15, h: 14 },
  { slug: "sparkle-star", label: "Sparkling star", w: 16, h: 15 },
  { slug: "red-shield", label: "Red shield", w: 14, h: 15 },
  { slug: "blue-shield", label: "Blue shield", w: 14, h: 15 },
  { slug: "key", label: "Key", w: 14, h: 15 },
  { slug: "red-vial", label: "Red vial", w: 10, h: 15 },
  { slug: "scroll", label: "Scroll", w: 16, h: 15 },
  { slug: "chest", label: "Chest", w: 15, h: 14 },
  { slug: "flask", label: "Flask", w: 12, h: 15 },
  { slug: "map", label: "Map", w: 16, h: 14 },
  { slug: "compass-rose", label: "Compass rose", w: 14, h: 15 },
  { slug: "skull-and-bones", label: "Skull and bones", w: 15, h: 15 },
  { slug: "crested-shield", label: "Crested shield", w: 14, h: 15 },
  { slug: "wooden-shield", label: "Wooden shield", w: 14, h: 14 },
  { slug: "open-chest", label: "Open chest", w: 16, h: 14 },
  { slug: "green-vial", label: "Green vial", w: 10, h: 14 },
  { slug: "treasure-map", label: "Treasure map", w: 16, h: 14 },
  { slug: "skull", label: "Skull", w: 14, h: 14 },
  { slug: "round-crest", label: "Round crest", w: 14, h: 14 },
  { slug: "bones", label: "Bones", w: 15, h: 15 },
  { slug: "ghost", label: "Ghost", w: 10, h: 14 },
  { slug: "moon", label: "Moon", w: 14, h: 14 },
  { slug: "old-compass", label: "Old compass", w: 14, h: 14 },
  { slug: "wand", label: "Wand", w: 15, h: 15 },
  { slug: "arrow", label: "Arrow", w: 10, h: 15 },
  { slug: "flame", label: "Flame", w: 16, h: 15 },
  { slug: "pickaxe", label: "Pickaxe", w: 15, h: 15 },
  { slug: "boots", label: "Boots", w: 16, h: 15 },
  { slug: "lion-crest", label: "Lion crest", w: 16, h: 15 },
  { slug: "dragon", label: "Dragon", w: 16, h: 15 },
  { slug: "fire", label: "Fire", w: 16, h: 15 },
  { slug: "staff", label: "Staff", w: 16, h: 15 },
  { slug: "hatchet", label: "Hatchet", w: 15, h: 15 },
  { slug: "axe", label: "Axe", w: 14, h: 15 },
  { slug: "hammer", label: "Hammer", w: 16, h: 15 },
  { slug: "bow", label: "Bow", w: 15, h: 15 },
  { slug: "gauntlet", label: "Gauntlet", w: 15, h: 15 },
  { slug: "helm", label: "Helm", w: 14, h: 15 },
  { slug: "knight-helm", label: "Knight's helm", w: 12, h: 15 },
  { slug: "gold-helm", label: "Gold helm", w: 14, h: 14 },
  { slug: "plank", label: "Plank", w: 14, h: 14 },
  { slug: "red-orb", label: "Red orb", w: 14, h: 14 },
  { slug: "beast-head", label: "Beast head", w: 16, h: 15 },
  { slug: "gold-bar", label: "Gold bar", w: 15, h: 13 },
  { slug: "stone", label: "Stone", w: 14, h: 12 },
  { slug: "green-bar", label: "Green bar", w: 14, h: 12 },
  { slug: "log", label: "Log", w: 14, h: 12 },
  { slug: "silver-bar", label: "Silver bar", w: 14, h: 12 },
  { slug: "coal", label: "Coal", w: 14, h: 12 },
  { slug: "diamond", label: "Diamond", w: 14, h: 11 },
  { slug: "dagger-crest", label: "Dagger crest", w: 14, h: 15 },
  { slug: "ribbon-medal", label: "Ribbon medal", w: 12, h: 16 },
  { slug: "old-map", label: "Old map", w: 16, h: 15 },
  { slug: "golem", label: "Golem", w: 16, h: 15 },
  { slug: "demon", label: "Demon", w: 16, h: 15 },
  { slug: "imp", label: "Imp", w: 16, h: 15 },
  { slug: "trophy", label: "Trophy", w: 16, h: 15 },
  { slug: "gem", label: "Gem", w: 14, h: 14 },
  { slug: "shovel", label: "Shovel", w: 13, h: 13 },
  { slug: "feather", label: "Feather", w: 14, h: 13 },
] as const;
export type ItemSlug = (typeof ITEMS)[number]["slug"];

export const NO_ITEM = "none";

export type TokenDesign = {
  shape: ShapeKey;
  /** 50, 75 or 100: how much of the picture the shape takes. */
  badge_size: BadgeSize;
  /** The shape's own colour. */
  fill: TokenColour;
  /** The band inside the edge, on framed shapes. */
  rim: TokenColour;
  a: ItemSlug | typeof NO_ITEM;
  a_flip: boolean;
  /** Quarter turns clockwise, 0–3. */
  a_rot: 0 | 1 | 2 | 3;
  /** Hundredths of the drawn size: 55, 70, 85 or 100. */
  a_size: SizeKey;
  /** Where its centre sits, in cells from the middle of the picture. */
  a_x: number;
  a_y: number;
  b: ItemSlug | typeof NO_ITEM;
  b_flip: boolean;
  b_rot: 0 | 1 | 2 | 3;
  b_size: SizeKey;
  b_x: number;
  b_y: number;
  /** Which item is drawn last, over the other. */
  top: "a" | "b";
};

const COLOUR_KEYS: readonly string[] = TOKEN_COLOURS.map((c) => c.key);
const BADGE_SIZE_KEYS: readonly number[] = BADGE_SIZES;
const SHAPE_KEYS: readonly string[] = SHAPES.map((f) => f.key);
const SIZE_KEYS: readonly number[] = SIZES;
const ITEM_KEYS: readonly string[] = [NO_ITEM, ...ITEMS.map((i) => i.slug)];

export const colourHex = (key: string): string =>
  TOKEN_COLOURS.find((c) => c.key === key)?.hex ?? TOKEN_COLOURS[0].hex;
export const isFramed = (shape: ShapeKey): boolean => SHAPES.find((s) => s.key === shape)?.framed ?? false;

export function defaultToken(): TokenDesign {
  return {
    shape: "circle-frame",
    badge_size: 100,
    fill: "blu-dark",
    rim: "gold",
    a: "sword",
    a_flip: false,
    a_rot: 0,
    a_size: 100,
    a_x: 0,
    a_y: 0,
    b: "sword",
    b_flip: true,
    b_rot: 0,
    b_size: 100,
    b_x: 0,
    b_y: 0,
    top: "b",
  };
}

const pick = <T extends string>(v: unknown, list: readonly string[], fallback: T): T =>
  typeof v === "string" && list.includes(v) ? (v as T) : fallback;
const rot = (v: unknown, fallback: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 =>
  v === 0 || v === 1 || v === 2 || v === 3 ? v : fallback;
/** A size from the list; the first designs said "big", "small" or "normal", or went above 100. */
const size = (v: unknown): SizeKey => {
  if (typeof v === "number" && (SIZES as readonly number[]).includes(v)) return v as SizeKey;
  return v === "small" ? 70 : 100;
};
/** An offset in cells, whole and no further than `max` either way. */
const offset = (v: unknown, max: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(-max, Math.min(max, Math.round(v))) : 0;
const badgeSize = (v: unknown): BadgeSize =>
  typeof v === "number" && (BADGE_SIZES as readonly number[]).includes(v) ? (v as BadgeSize) : 100;

/** How far an item's centre may sit from the middle and still be wholly in the picture,
 *  given its turn and size (the compositor scales and turns it the same way). */
export function itemBounds(slug: string, rot: number, size: SizeKey): { x: number; y: number } {
  const it = ITEMS.find((i) => i.slug === slug);
  if (!it) return { x: 0, y: 0 };
  const f = size / 100;
  const sw = Math.max(1, Math.round(it.w * f));
  const sh = Math.max(1, Math.round(it.h * f));
  const w = rot % 2 === 0 ? sw : sh;
  const h = rot % 2 === 0 ? sh : sw;
  const C = TOKEN_SIZE / 2;
  return { x: Math.floor(C - w / 2), y: Math.floor(C - h / 2) };
}

/** Whatever was saved, as a complete design. Anything unknown falls back to the default. */
export function normalizeToken(raw: unknown): TokenDesign {
  const d = defaultToken();
  const c = (raw ?? {}) as Record<string, unknown>;
  const a = pick(c.a, ITEM_KEYS, d.a);
  const aRot = rot(c.a_rot, 0);
  const aSize = size(c.a_size);
  const ab = itemBounds(a, aRot, aSize);
  const b = pick(c.b, ITEM_KEYS, d.b);
  const bRot = rot(c.b_rot, 0);
  const bSize = size(c.b_size);
  const bb = itemBounds(b, bRot, bSize);
  return {
    shape: pick(c.shape, SHAPE_KEYS, d.shape),
    badge_size: badgeSize(c.badge_size),
    fill: pick(c.fill, COLOUR_KEYS, d.fill),
    rim: pick(c.rim, COLOUR_KEYS, d.rim),
    a,
    a_flip: c.a_flip === true,
    a_rot: aRot,
    a_size: aSize,
    a_x: offset(c.a_x, ab.x),
    a_y: offset(c.a_y, ab.y),
    b,
    b_flip: c.b_flip === true,
    b_rot: bRot,
    b_size: bSize,
    b_x: offset(c.b_x, bb.x),
    b_y: offset(c.b_y, bb.y),
    top: c.top === "a" ? "a" : "b",
  };
}

// ------------------------------------------------------------ url packing

/** Bump when the compositor changes: tokens are cached immutably by their packed spec. */
export const TOKEN_RENDER = "6";

/** flip, size and turn of one item in one number: flip × 16 + size step × 4 + turn, 0–31. */
const flags = (flip: boolean, sz: SizeKey, r: number) => (flip ? 16 : 0) + SIZE_KEYS.indexOf(sz) * 4 + r;
const unflags = (n: number) => ({ flip: n >= 16, size: SIZE_KEYS[Math.floor((n % 16) / 4)] as SizeKey, rot: (n % 4) as 0 | 1 | 2 | 3 });

/** `/token/<this>.png` draws the design. Each part is an index into its list, base 36. */
export function packToken(design: TokenDesign): string {
  const d = normalizeToken(design);
  const parts = [
    SHAPE_KEYS.indexOf(d.shape),
    BADGE_SIZE_KEYS.indexOf(d.badge_size),
    COLOUR_KEYS.indexOf(d.fill),
    COLOUR_KEYS.indexOf(d.rim),
    ITEM_KEYS.indexOf(d.a),
    flags(d.a_flip, d.a_size, d.a_rot),
    d.a_x + OFFSET_MAX,
    d.a_y + OFFSET_MAX,
    ITEM_KEYS.indexOf(d.b),
    flags(d.b_flip, d.b_size, d.b_rot),
    d.b_x + OFFSET_MAX,
    d.b_y + OFFSET_MAX,
    d.top === "a" ? 0 : 1,
  ];
  return [TOKEN_RENDER, ...parts.map((n) => n.toString(36))].join(".");
}

export function unpackToken(packed: string): TokenDesign | null {
  if (packed.length > 52) return null;
  const parts = packed.split(".");
  if (parts.length !== 14 || parts[0] !== TOKEN_RENDER) return null;
  const nums: number[] = [];
  for (const p of parts.slice(1)) {
    const n = parseInt(p, 36);
    // One canonical spelling per number, so the same token is one URL.
    if (!Number.isFinite(n) || n < 0 || p !== n.toString(36)) return null;
    nums.push(n);
  }
  const at = (list: readonly string[], n: number) => (n < list.length ? list[n] : null);
  const [nShape, nBadge, nFill, nRim, nA, fA, ax, ay, nB, fB, bx, by, nTop] = nums;
  const shape = at(SHAPE_KEYS, nShape);
  const fill = at(COLOUR_KEYS, nFill);
  const rim = at(COLOUR_KEYS, nRim);
  const a = at(ITEM_KEYS, nA);
  const b = at(ITEM_KEYS, nB);
  if (!shape || !fill || !rim || !a || !b) return null;
  if (nBadge >= BADGE_SIZE_KEYS.length || fA > 31 || fB > 31 || nTop > 1) return null;
  if ([ax, ay, bx, by].some((n) => n > 2 * OFFSET_MAX)) return null;
  const fa = unflags(fA);
  const fb = unflags(fB);
  const d = normalizeToken({
    shape,
    badge_size: BADGE_SIZE_KEYS[nBadge],
    fill,
    rim,
    a,
    a_flip: fa.flip,
    a_rot: fa.rot,
    a_size: fa.size,
    a_x: ax - OFFSET_MAX,
    a_y: ay - OFFSET_MAX,
    b,
    b_flip: fb.flip,
    b_rot: fb.rot,
    b_size: fb.size,
    b_x: bx - OFFSET_MAX,
    b_y: by - OFFSET_MAX,
    top: nTop === 0 ? "a" : "b",
  });
  // Only the one URL per token: a spec that normalises to something else is not one.
  return packToken(d) === packed ? d : null;
}

export const tokenSrc = (design: TokenDesign): string => `/token/${packToken(design)}.png`;

/** "Marrow's Token": the first word of the character's name, or the handle. */
export function tokenTitle(displayName: string | null | undefined, handle: string): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0] || handle;
  return `${first}'s Token`;
}
