// A token: the badge a person designs for themselves and gives away, once every six
// months, for 10 max mana. It is built from parts rather than drawn: a badge shape (a
// circle, a framed circle, a shield, a diamond...) in a colour of their choosing, with a
// rim colour for the framed shapes, and two items from the uploaded set, each of which can
// be flipped, turned, made big or small, and sit over or under the other. Everything here
// is shared by the designer (browser) and the compositor (server, lib/token.server.ts);
// /token/<packed>.png draws one, and the packed spec fully describes it.

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

export const SIZES = [
  { key: "small", label: "Small" },
  { key: "normal", label: "As drawn" },
  { key: "big", label: "Big" },
] as const;
export type SizeKey = (typeof SIZES)[number]["key"];

/** The items, as files under /badges/items/ (public/badges/items). */
export const ITEMS = [
  { slug: "sword", label: "Sword" },
  { slug: "longsword", label: "Longsword" },
  { slug: "medal", label: "Medal" },
  { slug: "mace", label: "Mace" },
  { slug: "star", label: "Star" },
  { slug: "compass", label: "Compass" },
  { slug: "crown", label: "Crown" },
  { slug: "gold-coin", label: "Gold coin" },
  { slug: "coin", label: "Coin" },
  { slug: "heart", label: "Heart" },
  { slug: "sparkle-star", label: "Sparkling star" },
  { slug: "red-shield", label: "Red shield" },
  { slug: "blue-shield", label: "Blue shield" },
  { slug: "key", label: "Key" },
  { slug: "red-vial", label: "Red vial" },
  { slug: "scroll", label: "Scroll" },
  { slug: "chest", label: "Chest" },
  { slug: "flask", label: "Flask" },
  { slug: "map", label: "Map" },
  { slug: "compass-rose", label: "Compass rose" },
  { slug: "skull-and-bones", label: "Skull and bones" },
  { slug: "crested-shield", label: "Crested shield" },
  { slug: "wooden-shield", label: "Wooden shield" },
  { slug: "open-chest", label: "Open chest" },
  { slug: "green-vial", label: "Green vial" },
  { slug: "treasure-map", label: "Treasure map" },
  { slug: "skull", label: "Skull" },
  { slug: "round-crest", label: "Round crest" },
  { slug: "bones", label: "Bones" },
  { slug: "ghost", label: "Ghost" },
  { slug: "moon", label: "Moon" },
  { slug: "old-compass", label: "Old compass" },
  { slug: "wand", label: "Wand" },
  { slug: "arrow", label: "Arrow" },
  { slug: "flame", label: "Flame" },
  { slug: "pickaxe", label: "Pickaxe" },
  { slug: "boots", label: "Boots" },
  { slug: "lion-crest", label: "Lion crest" },
  { slug: "dragon", label: "Dragon" },
  { slug: "fire", label: "Fire" },
  { slug: "staff", label: "Staff" },
  { slug: "hatchet", label: "Hatchet" },
  { slug: "axe", label: "Axe" },
  { slug: "hammer", label: "Hammer" },
  { slug: "bow", label: "Bow" },
  { slug: "gauntlet", label: "Gauntlet" },
  { slug: "helm", label: "Helm" },
  { slug: "knight-helm", label: "Knight's helm" },
  { slug: "gold-helm", label: "Gold helm" },
  { slug: "plank", label: "Plank" },
  { slug: "red-orb", label: "Red orb" },
  { slug: "beast-head", label: "Beast head" },
  { slug: "gold-bar", label: "Gold bar" },
  { slug: "stone", label: "Stone" },
  { slug: "green-bar", label: "Green bar" },
  { slug: "log", label: "Log" },
  { slug: "silver-bar", label: "Silver bar" },
  { slug: "coal", label: "Coal" },
  { slug: "diamond", label: "Diamond" },
  { slug: "dagger-crest", label: "Dagger crest" },
  { slug: "ribbon-medal", label: "Ribbon medal" },
  { slug: "old-map", label: "Old map" },
  { slug: "golem", label: "Golem" },
  { slug: "demon", label: "Demon" },
  { slug: "imp", label: "Imp" },
  { slug: "trophy", label: "Trophy" },
  { slug: "gem", label: "Gem" },
  { slug: "shovel", label: "Shovel" },
  { slug: "feather", label: "Feather" },
] as const;
export type ItemSlug = (typeof ITEMS)[number]["slug"];

export const NO_ITEM = "none";

export type TokenDesign = {
  shape: ShapeKey;
  /** The shape's own colour. */
  fill: TokenColour;
  /** The band inside the edge, on framed shapes. */
  rim: TokenColour;
  a: ItemSlug | typeof NO_ITEM;
  a_flip: boolean;
  /** Quarter turns clockwise, 0–3. */
  a_rot: 0 | 1 | 2 | 3;
  /** Three in ten bigger or smaller than drawn, or as drawn. */
  a_size: SizeKey;
  b: ItemSlug | typeof NO_ITEM;
  b_flip: boolean;
  b_rot: 0 | 1 | 2 | 3;
  b_size: SizeKey;
  /** Which item is drawn last, over the other. */
  top: "a" | "b";
};

const COLOUR_KEYS: readonly string[] = TOKEN_COLOURS.map((c) => c.key);
const SHAPE_KEYS: readonly string[] = SHAPES.map((f) => f.key);
const SIZE_KEYS: readonly string[] = SIZES.map((f) => f.key);
const ITEM_KEYS: readonly string[] = [NO_ITEM, ...ITEMS.map((i) => i.slug)];

export const colourHex = (key: string): string =>
  TOKEN_COLOURS.find((c) => c.key === key)?.hex ?? TOKEN_COLOURS[0].hex;
export const isFramed = (shape: ShapeKey): boolean => SHAPES.find((s) => s.key === shape)?.framed ?? false;

export function defaultToken(): TokenDesign {
  return {
    shape: "circle-frame",
    fill: "blu-dark",
    rim: "gold",
    a: "sword",
    a_flip: false,
    a_rot: 0,
    a_size: "normal",
    b: "sword",
    b_flip: true,
    b_rot: 0,
    b_size: "normal",
    top: "b",
  };
}

const pick = <T extends string>(v: unknown, list: readonly string[], fallback: T): T =>
  typeof v === "string" && list.includes(v) ? (v as T) : fallback;
const rot = (v: unknown, fallback: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 =>
  v === 0 || v === 1 || v === 2 || v === 3 ? v : fallback;

/** Whatever was saved, as a complete design. Anything unknown falls back to the default. */
export function normalizeToken(raw: unknown): TokenDesign {
  const d = defaultToken();
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    shape: pick(c.shape, SHAPE_KEYS, d.shape),
    fill: pick(c.fill, COLOUR_KEYS, d.fill),
    rim: pick(c.rim, COLOUR_KEYS, d.rim),
    a: pick(c.a, ITEM_KEYS, d.a),
    a_flip: c.a_flip === true,
    a_rot: rot(c.a_rot, 0),
    a_size: pick(c.a_size, SIZE_KEYS, "normal"),
    b: pick(c.b, ITEM_KEYS, d.b),
    b_flip: c.b_flip === true,
    b_rot: rot(c.b_rot, 0),
    b_size: pick(c.b_size, SIZE_KEYS, "normal"),
    top: c.top === "a" ? "a" : "b",
  };
}

// ------------------------------------------------------------ url packing

/** Bump when the compositor changes: tokens are cached immutably by their packed spec. */
export const TOKEN_RENDER = "2";

/** flip, size and turn of one item in one number: flip × 12 + size × 4 + turn, 0–23. */
const flags = (flip: boolean, size: SizeKey, r: number) => (flip ? 12 : 0) + SIZE_KEYS.indexOf(size) * 4 + r;
const unflags = (n: number) => ({ flip: n >= 12, size: SIZE_KEYS[Math.floor((n % 12) / 4)] as SizeKey, rot: (n % 4) as 0 | 1 | 2 | 3 });

/** `/token/<this>.png` draws the design. Each part is an index into its list, base 36. */
export function packToken(design: TokenDesign): string {
  const d = normalizeToken(design);
  const parts = [
    SHAPE_KEYS.indexOf(d.shape),
    COLOUR_KEYS.indexOf(d.fill),
    COLOUR_KEYS.indexOf(d.rim),
    ITEM_KEYS.indexOf(d.a),
    flags(d.a_flip, d.a_size, d.a_rot),
    ITEM_KEYS.indexOf(d.b),
    flags(d.b_flip, d.b_size, d.b_rot),
    d.top === "a" ? 0 : 1,
  ];
  return [TOKEN_RENDER, ...parts.map((n) => n.toString(36))].join(".");
}

export function unpackToken(packed: string): TokenDesign | null {
  if (packed.length > 40) return null;
  const parts = packed.split(".");
  if (parts.length !== 9 || parts[0] !== TOKEN_RENDER) return null;
  const nums: number[] = [];
  for (const p of parts.slice(1)) {
    const n = parseInt(p, 36);
    // One canonical spelling per number, so the same token is one URL.
    if (!Number.isFinite(n) || n < 0 || p !== n.toString(36)) return null;
    nums.push(n);
  }
  const at = (list: readonly string[], n: number) => (n < list.length ? list[n] : null);
  const shape = at(SHAPE_KEYS, nums[0]);
  const fill = at(COLOUR_KEYS, nums[1]);
  const rim = at(COLOUR_KEYS, nums[2]);
  const a = at(ITEM_KEYS, nums[3]);
  const b = at(ITEM_KEYS, nums[5]);
  if (!shape || !fill || !rim || !a || !b) return null;
  if (nums[4] > 23 || nums[6] > 23 || nums[7] > 1) return null;
  const fa = unflags(nums[4]);
  const fb = unflags(nums[6]);
  return normalizeToken({
    shape,
    fill,
    rim,
    a,
    a_flip: fa.flip,
    a_rot: fa.rot,
    a_size: fa.size,
    b,
    b_flip: fb.flip,
    b_rot: fb.rot,
    b_size: fb.size,
    top: nums[7] === 0 ? "a" : "b",
  });
}

export const tokenSrc = (design: TokenDesign): string => `/token/${packToken(design)}.png`;

/** "Marrow's Token": the first word of the character's name, or the handle. */
export function tokenTitle(displayName: string | null | undefined, handle: string): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0] || handle;
  return `${first}'s Token`;
}
