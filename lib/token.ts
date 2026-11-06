// A token: the badge a person designs for themselves and gives away, once every six
// months, for 7 max mana. It is built from parts rather than drawn: a badge shape (a
// circle, a framed circle, a shield, a diamond...) in a colour of their choosing, with a
// rim colour for the framed shapes, and up to three items from the uploaded set, placed by
// dragging, each of which can be flipped, turned (in steps of 45 degrees), shrunk in steps of
// fifteen in a hundred, set behind the badge or in front of it, and drawn over or under the
// others. The shape is drawn small on purpose, so an item at its
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

/** The three places an icon can sit. */
export const SLOTS = ["a", "b", "c"] as const;
export type Slot = (typeof SLOTS)[number];

/** Turns are in eighths of a full turn, clockwise: 0 is as drawn, 1 is 45 degrees, 2 is a
 *  quarter turn, up to 7. (The first designs turned in quarters, 0 to 3; they are read as
 *  twice that.) */
export const TURNS = 8;
export type Turn = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Every order three icons can be drawn in, first to last. */
export const ORDERS = ["abc", "acb", "bac", "bca", "cab", "cba"] as const;
export type Order = (typeof ORDERS)[number];

export type TokenDesign = {
  shape: ShapeKey;
  /** 50, 75 or 100: how much of the picture the shape takes. */
  badge_size: BadgeSize;
  /** The shape's own colour. */
  fill: TokenColour;
  /** The band inside the edge, on framed shapes. */
  rim: TokenColour;
  /** Which order the icons are drawn in, first to last: the last is on top of the rest. */
  order: Order;
} & {
  [K in Slot]: ItemSlug | typeof NO_ITEM;
} & {
  [K in Slot as `${K}_flip`]: boolean;
} & {
  /** Eighths of a turn clockwise, 0–7. */
  [K in Slot as `${K}_turn`]: Turn;
} & {
  /** Hundredths of the drawn size: 55, 70, 85 or 100. */
  [K in Slot as `${K}_size`]: SizeKey;
} & {
  /** Where its centre sits, in cells from the middle of the picture. */
  [K in Slot as `${K}_x`]: number;
} & {
  [K in Slot as `${K}_y`]: number;
} & {
  /** Drawn under the badge shape, so only what hangs out past it shows. */
  [K in Slot as `${K}_behind`]: boolean;
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
    order: "abc",
    a: "sword", a_flip: false, a_turn: 0, a_size: 100, a_x: 0, a_y: 0, a_behind: false,
    b: "sword", b_flip: true, b_turn: 0, b_size: 100, b_x: 0, b_y: 0, b_behind: false,
    c: NO_ITEM, c_flip: false, c_turn: 0, c_size: 100, c_x: 0, c_y: 0, c_behind: false,
  };
}

const pick = <T extends string>(v: unknown, list: readonly string[], fallback: T): T =>
  typeof v === "string" && list.includes(v) ? (v as T) : fallback;
/** A turn in eighths; a design from before diagonals has `_rot` in quarters instead. */
const turn = (eighths: unknown, quarters: unknown): Turn => {
  if (typeof eighths === "number" && Number.isInteger(eighths) && eighths >= 0 && eighths < TURNS) return eighths as Turn;
  if (typeof quarters === "number" && Number.isInteger(quarters) && quarters >= 0 && quarters < 4) return (quarters * 2) as Turn;
  return 0;
};
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

/** The size of the box an item takes once scaled and turned: a quarter turn swaps its sides,
 *  a diagonal one needs room for the corners (the compositor makes the same box). */
export function turnedBox(w: number, h: number, t: number): { w: number; h: number } {
  if (t % 2 === 0) return (t / 2) % 2 === 0 ? { w, h } : { w: h, h: w };
  const side = Math.ceil((w + h) * Math.SQRT1_2 - 1e-9);
  return { w: side, h: side };
}

/** How far an item's centre may sit from the middle and still be wholly in the picture,
 *  given its turn and size (the compositor scales and turns it the same way). */
export function itemBounds(slug: string, t: number, sz: SizeKey): { x: number; y: number } {
  const it = ITEMS.find((i) => i.slug === slug);
  if (!it) return { x: 0, y: 0 };
  const f = sz / 100;
  const sw = Math.max(1, Math.round(it.w * f));
  const sh = Math.max(1, Math.round(it.h * f));
  const box = turnedBox(sw, sh, t);
  const C = TOKEN_SIZE / 2;
  return { x: Math.floor(C - box.w / 2), y: Math.floor(C - box.h / 2) };
}

/** Whatever was saved, as a complete design. Anything unknown falls back to the default. */
export function normalizeToken(raw: unknown): TokenDesign {
  const d = defaultToken();
  const c = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {
    shape: pick(c.shape, SHAPE_KEYS, d.shape),
    badge_size: badgeSize(c.badge_size),
    fill: pick(c.fill, COLOUR_KEYS, d.fill),
    rim: pick(c.rim, COLOUR_KEYS, d.rim),
  };
  for (const k of SLOTS) {
    // A third icon is new: a design from before it has none rather than the default's.
    const slug = pick(c[k], ITEM_KEYS, k === "c" ? NO_ITEM : d[k]);
    const t = turn(c[`${k}_turn`], c[`${k}_rot`]);
    const sz = size(c[`${k}_size`]);
    const bounds = itemBounds(slug, t, sz);
    out[k] = slug;
    out[`${k}_flip`] = c[`${k}_flip`] === true;
    out[`${k}_turn`] = t;
    out[`${k}_size`] = sz;
    out[`${k}_x`] = offset(c[`${k}_x`], bounds.x);
    out[`${k}_y`] = offset(c[`${k}_y`], bounds.y);
    out[`${k}_behind`] = c[`${k}_behind`] === true;
  }
  // The draw order; the first designs only said which of two was on top.
  out.order = (ORDERS as readonly string[]).includes(c.order as string)
    ? (c.order as Order)
    : c.top === "a"
      ? "bac"
      : "abc";
  return out as TokenDesign;
}

/** Put one icon last in the order, on top of the others. */
export function bringToFront(order: Order, slot: Slot): Order {
  return [...order.replace(slot, ""), slot].join("") as Order;
}

// ------------------------------------------------------------ url packing

/** Bump when the compositor changes: tokens are cached immutably by their packed spec. */
export const TOKEN_RENDER = "7";

/** behind, flip, size and turn of one icon in one number: behind × 64 + flip × 32 +
 *  size step × 8 + turn, 0–127. */
const flags = (behind: boolean, flip: boolean, sz: SizeKey, t: number) =>
  (behind ? 64 : 0) + (flip ? 32 : 0) + SIZE_KEYS.indexOf(sz) * 8 + t;
const unflags = (n: number) => ({
  behind: n >= 64,
  flip: n % 64 >= 32,
  size: SIZE_KEYS[Math.floor((n % 32) / 8)] as SizeKey,
  turn: (n % 8) as Turn,
});

/** `/token/<this>.png` draws the design. Each part is an index into its list, base 36. */
export function packToken(design: TokenDesign): string {
  const d = normalizeToken(design);
  const parts: number[] = [
    SHAPE_KEYS.indexOf(d.shape),
    BADGE_SIZE_KEYS.indexOf(d.badge_size),
    COLOUR_KEYS.indexOf(d.fill),
    COLOUR_KEYS.indexOf(d.rim),
  ];
  for (const k of SLOTS) {
    parts.push(ITEM_KEYS.indexOf(d[k]), flags(d[`${k}_behind`], d[`${k}_flip`], d[`${k}_size`], d[`${k}_turn`]), d[`${k}_x`] + OFFSET_MAX, d[`${k}_y`] + OFFSET_MAX);
  }
  parts.push(ORDERS.indexOf(d.order));
  return [TOKEN_RENDER, ...parts.map((n) => n.toString(36))].join(".");
}

export function unpackToken(packed: string): TokenDesign | null {
  if (packed.length > 80) return null;
  const parts = packed.split(".");
  if (parts.length !== 1 + 4 + 4 * SLOTS.length + 1 || parts[0] !== TOKEN_RENDER) return null;
  const nums: number[] = [];
  for (const p of parts.slice(1)) {
    const n = parseInt(p, 36);
    // One canonical spelling per number, so the same token is one URL.
    if (!Number.isFinite(n) || n < 0 || p !== n.toString(36)) return null;
    nums.push(n);
  }
  const at = (list: readonly string[], n: number) => (n < list.length ? list[n] : null);
  const [nShape, nBadge, nFill, nRim] = nums;
  const shape = at(SHAPE_KEYS, nShape);
  const fill = at(COLOUR_KEYS, nFill);
  const rim = at(COLOUR_KEYS, nRim);
  const order = nums[nums.length - 1] < ORDERS.length ? ORDERS[nums[nums.length - 1]] : null;
  if (!shape || !fill || !rim || !order || nBadge >= BADGE_SIZE_KEYS.length) return null;
  const raw: Record<string, unknown> = { shape, badge_size: BADGE_SIZE_KEYS[nBadge], fill, rim, order };
  let i = 4;
  for (const k of SLOTS) {
    const [nItem, f, x, y] = nums.slice(i, i + 4);
    i += 4;
    const slug = at(ITEM_KEYS, nItem);
    if (!slug || f > 127 || x > 2 * OFFSET_MAX || y > 2 * OFFSET_MAX) return null;
    const u = unflags(f);
    raw[k] = slug;
    raw[`${k}_flip`] = u.flip;
    raw[`${k}_turn`] = u.turn;
    raw[`${k}_size`] = u.size;
    raw[`${k}_behind`] = u.behind;
    raw[`${k}_x`] = x - OFFSET_MAX;
    raw[`${k}_y`] = y - OFFSET_MAX;
  }
  const d = normalizeToken(raw);
  // Only the one URL per token: a spec that normalises to something else is not one.
  return packToken(d) === packed ? d : null;
}

export const tokenSrc = (design: TokenDesign): string => `/token/${packToken(design)}.png`;

/** "Marrow's Token": the first word of the character's name, or the handle. */
export function tokenTitle(displayName: string | null | undefined, handle: string): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0] || handle;
  return `${first}'s Token`;
}
