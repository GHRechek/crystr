// A token: the badge a person designs for themselves and gives away, once every six
// months, for 7 max mana. It is built from parts rather than drawn: a badge shape (a
// circle, a framed circle, a shield, a diamond...) in a colour of their choosing, with a
// rim colour for the framed shapes, and up to five items from the uploaded set, placed by
// dragging, each of which can be flipped, turned (in steps of 45 degrees), shrunk in steps of
// fifteen in a hundred, set behind the badge or in front of it by where they sit in one stack of layers (the
// badge shape is a layer too, or absent: a token can have no shape), and drawn over or under
// the others. The shape is drawn small on purpose, so an item at its
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
  /** No badge at all: just the icons. */
  { key: "none", label: "No shape", framed: false },
] as const;
export type ShapeKey = (typeof SHAPES)[number]["key"];

/** An item's size, in hundredths of how it was drawn. The editor offers 100 (as drawn) and
 *  larger, in steps of twenty-five; the smaller sizes are only there for designs made when
 *  icons could shrink, which are drawn as they were. */
export const SIZES = [55, 70, 85, 100, 125, 150, 175, 200] as const;
export type SizeKey = (typeof SIZES)[number];
/** The smallest size the editor will go down to. */
export const NORMAL_SIZE: SizeKey = 100;

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
  // The tradable badges, added after the rest so tokens already made keep their pictures.
  { slug: "t-bat-banner", label: "Bat banner", w: 22, h: 21 },
  { slug: "t-battleaxe", label: "Battleaxe", w: 21, h: 21 },
  { slug: "t-beating-heart", label: "Beating heart", w: 21, h: 21 },
  { slug: "t-bedroll", label: "Bedroll", w: 21, h: 21 },
  { slug: "t-blue-potion", label: "Blue potion", w: 22, h: 21 },
  { slug: "t-bone-claw", label: "Bone claw", w: 21, h: 21 },
  { slug: "t-bull-crest", label: "Bull crest", w: 21, h: 21 },
  { slug: "t-clear-flask", label: "Clear flask", w: 21, h: 21 },
  { slug: "t-crossbow", label: "Crossbow", w: 21, h: 21 },
  { slug: "t-crystal-ball", label: "Crystal ball", w: 21, h: 21 },
  { slug: "t-dragon-crest", label: "Dragon crest", w: 21, h: 21 },
  { slug: "t-fishing-rod", label: "Fishing rod", w: 21, h: 21 },
  { slug: "t-flail", label: "Flail", w: 21, h: 21 },
  { slug: "t-gold-nugget", label: "Gold nugget", w: 21, h: 21 },
  { slug: "t-golden-egg", label: "Golden egg", w: 21, h: 21 },
  { slug: "t-green-tonic", label: "Green tonic", w: 21, h: 21 },
  { slug: "t-heart-locket", label: "Heart locket", w: 21, h: 21 },
  { slug: "t-hook-and-line", label: "Hook and line", w: 21, h: 21 },
  { slug: "t-hourglass", label: "Hourglass", w: 21, h: 21 },
  { slug: "t-locked-chest", label: "Locked chest", w: 21, h: 21 },
  { slug: "t-lockpicks", label: "Lockpicks", w: 21, h: 21 },
  { slug: "t-mace", label: "Mace", w: 21, h: 21 },
  { slug: "t-old-map", label: "Old map", w: 21, h: 21 },
  { slug: "t-old-skull", label: "Old skull", w: 21, h: 21 },
  { slug: "t-owl-crest", label: "Owl crest", w: 21, h: 21 },
  { slug: "t-parchment", label: "Parchment", w: 21, h: 21 },
  { slug: "t-quill-and-ink", label: "Quill and ink", w: 22, h: 21 },
  { slug: "t-raw-ore", label: "Raw ore", w: 21, h: 21 },
  { slug: "t-red-potion", label: "Red potion", w: 21, h: 21 },
  { slug: "t-ruby", label: "Ruby", w: 21, h: 21 },
  { slug: "t-runestone", label: "Runestone", w: 21, h: 21 },
  { slug: "t-sapphire", label: "Sapphire", w: 21, h: 21 },
  { slug: "t-scorpion-crest", label: "Scorpion crest", w: 21, h: 21 },
  { slug: "t-scythe", label: "Scythe", w: 22, h: 21 },
  { slug: "t-sealed-scroll", label: "Sealed scroll", w: 21, h: 21 },
  { slug: "t-serpent-crest", label: "Serpent crest", w: 21, h: 21 },
  { slug: "t-short-sword", label: "Short sword", w: 21, h: 21 },
  { slug: "t-shovel", label: "Shovel", w: 21, h: 21 },
  { slug: "t-silver-ring", label: "Silver ring", w: 21, h: 21 },
  { slug: "t-spear", label: "Spear", w: 21, h: 21 },
  { slug: "t-spider-crest", label: "Spider crest", w: 21, h: 21 },
  { slug: "t-stag-crest", label: "Stag crest", w: 21, h: 21 },
  { slug: "t-star-wand", label: "Star wand", w: 21, h: 21 },
  { slug: "t-sun-disc", label: "Sun disc", w: 21, h: 21 },
  { slug: "t-tanned-hide", label: "Tanned hide", w: 22, h: 21 },
  { slug: "t-timber", label: "Timber", w: 21, h: 21 },
  { slug: "t-warhammer", label: "Warhammer", w: 21, h: 21 },
  { slug: "t-wizards-staff", label: "Wizards staff", w: 21, h: 21 },
  // The extra pictures from the badge set (300 up), added last for the same reason.
  { slug: "s-300", label: "Picture 300", w: 20, h: 19 },
  { slug: "s-301", label: "Picture 301", w: 20, h: 19 },
  { slug: "s-302", label: "Picture 302", w: 19, h: 19 },
  { slug: "s-303", label: "Picture 303", w: 20, h: 19 },
  { slug: "s-304", label: "Picture 304", w: 20, h: 20 },
  { slug: "s-305", label: "Picture 305", w: 20, h: 20 },
  { slug: "s-306", label: "Picture 306", w: 20, h: 20 },
  { slug: "s-307", label: "Picture 307", w: 20, h: 20 },
  { slug: "s-308", label: "Picture 308", w: 20, h: 20 },
  { slug: "s-309", label: "Picture 309", w: 20, h: 20 },
  { slug: "s-310", label: "Picture 310", w: 20, h: 20 },
  { slug: "s-311", label: "Picture 311", w: 20, h: 20 },
  { slug: "s-312", label: "Picture 312", w: 18, h: 18 },
  { slug: "s-313", label: "Picture 313", w: 17, h: 18 },
  { slug: "s-314", label: "Picture 314", w: 17, h: 19 },
  { slug: "s-315", label: "Picture 315", w: 18, h: 19 },
  { slug: "s-316", label: "Picture 316", w: 18, h: 19 },
  { slug: "s-317", label: "Picture 317", w: 15, h: 18 },
  { slug: "s-318", label: "Picture 318", w: 15, h: 18 },
  { slug: "s-319", label: "Picture 319", w: 17, h: 18 },
  { slug: "s-320", label: "Picture 320", w: 17, h: 18 },
  { slug: "s-321", label: "Picture 321", w: 17, h: 19 },
  { slug: "s-322", label: "Picture 322", w: 18, h: 18 },
  { slug: "s-323", label: "Picture 323", w: 17, h: 19 },
  { slug: "s-324", label: "Picture 324", w: 13, h: 18 },
  { slug: "s-325", label: "Picture 325", w: 18, h: 13 },
  { slug: "s-326", label: "Picture 326", w: 18, h: 17 },
  { slug: "s-327", label: "Picture 327", w: 18, h: 17 },
  { slug: "s-328", label: "Picture 328", w: 18, h: 17 },
  { slug: "s-329", label: "Picture 329", w: 16, h: 16 },
  { slug: "s-330", label: "Picture 330", w: 16, h: 15 },
  { slug: "s-331", label: "Picture 331", w: 16, h: 16 },
  { slug: "s-332", label: "Picture 332", w: 16, h: 17 },
  { slug: "s-333", label: "Picture 333", w: 18, h: 17 },
  { slug: "s-334", label: "Picture 334", w: 18, h: 17 },
  { slug: "s-335", label: "Picture 335", w: 14, h: 15 },
  { slug: "s-336", label: "Picture 336", w: 14, h: 16 },
  { slug: "s-337", label: "Picture 337", w: 16, h: 15 },
  { slug: "s-338", label: "Picture 338", w: 15, h: 15 },
  { slug: "s-339", label: "Picture 339", w: 16, h: 17 },
  { slug: "s-340", label: "Picture 340", w: 18, h: 17 },
  { slug: "s-341", label: "Picture 341", w: 18, h: 17 },
  { slug: "s-342", label: "Picture 342", w: 14, h: 15 },
  { slug: "s-343", label: "Picture 343", w: 18, h: 16 },
  { slug: "s-344", label: "Picture 344", w: 18, h: 16 },
  { slug: "s-345", label: "Picture 345", w: 16, h: 16 },
  { slug: "s-346", label: "Picture 346", w: 18, h: 16 },
  { slug: "s-347", label: "Picture 347", w: 16, h: 17 },
  { slug: "s-348", label: "Picture 348", w: 14, h: 17 },
  { slug: "s-349", label: "Picture 349", w: 12, h: 16 },
  { slug: "s-350", label: "Picture 350", w: 15, h: 16 },
  { slug: "s-351", label: "Picture 351", w: 10, h: 16 },
  { slug: "s-352", label: "Picture 352", w: 20, h: 21 },
  { slug: "s-353", label: "Picture 353", w: 13, h: 20 },
  { slug: "s-354", label: "Picture 354", w: 20, h: 20 },
  { slug: "s-355", label: "Picture 355", w: 18, h: 20 },
  { slug: "s-356", label: "Picture 356", w: 19, h: 19 },
  { slug: "s-357", label: "Picture 357", w: 17, h: 18 },
  { slug: "s-358", label: "Picture 358", w: 20, h: 20 },
  { slug: "s-359", label: "Picture 359", w: 20, h: 20 },
  { slug: "s-360", label: "Picture 360", w: 21, h: 20 },
  { slug: "s-361", label: "Picture 361", w: 20, h: 20 },
  { slug: "s-362", label: "Picture 362", w: 20, h: 21 },
  { slug: "s-363", label: "Picture 363", w: 18, h: 16 },
  { slug: "s-364", label: "Picture 364", w: 14, h: 19 },
  { slug: "s-365", label: "Picture 365", w: 17, h: 18 },
  { slug: "s-366", label: "Picture 366", w: 19, h: 15 },
  { slug: "s-367", label: "Picture 367", w: 17, h: 17 },
  { slug: "s-368", label: "Picture 368", w: 14, h: 19 },
  { slug: "s-369", label: "Picture 369", w: 19, h: 18 },
  { slug: "s-370", label: "Picture 370", w: 14, h: 18 },
  { slug: "s-371", label: "Picture 371", w: 18, h: 18 },
  { slug: "s-372", label: "Picture 372", w: 18, h: 18 },
  { slug: "s-373", label: "Picture 373", w: 19, h: 18 },
  { slug: "s-374", label: "Picture 374", w: 19, h: 14 },
  { slug: "s-375", label: "Picture 375", w: 14, h: 18 },
  { slug: "s-376", label: "Picture 376", w: 14, h: 18 },
  { slug: "s-377", label: "Picture 377", w: 17, h: 17 },
  { slug: "s-378", label: "Picture 378", w: 16, h: 17 },
  { slug: "s-379", label: "Picture 379", w: 17, h: 17 },
  { slug: "s-380", label: "Picture 380", w: 14, h: 17 },
  { slug: "s-381", label: "Picture 381", w: 17, h: 17 },
  { slug: "s-382", label: "Picture 382", w: 21, h: 21 },
  { slug: "s-383", label: "Picture 383", w: 22, h: 21 },
  { slug: "s-384", label: "Picture 384", w: 21, h: 21 },
  { slug: "s-385", label: "Picture 385", w: 21, h: 21 },
  { slug: "s-386", label: "Picture 386", w: 21, h: 21 },
  { slug: "s-387", label: "Picture 387", w: 21, h: 21 },
  { slug: "s-388", label: "Picture 388", w: 21, h: 21 },
  { slug: "s-389", label: "Picture 389", w: 21, h: 21 },
  { slug: "s-390", label: "Picture 390", w: 21, h: 21 },
  { slug: "s-391", label: "Picture 391", w: 21, h: 21 },
  { slug: "s-392", label: "Picture 392", w: 23, h: 23 },
  { slug: "s-393", label: "Picture 393", w: 23, h: 23 },
  { slug: "s-394", label: "Picture 394", w: 23, h: 23 },
  { slug: "s-395", label: "Picture 395", w: 23, h: 23 },
  { slug: "s-396", label: "Picture 396", w: 23, h: 23 },
  { slug: "s-397", label: "Picture 397", w: 19, h: 20 },
  { slug: "s-398", label: "Picture 398", w: 13, h: 20 },
  { slug: "s-399", label: "Picture 399", w: 19, h: 18 },
  { slug: "s-400", label: "Picture 400", w: 16, h: 18 },
  { slug: "s-401", label: "Picture 401", w: 15, h: 18 },
  { slug: "s-402", label: "Picture 402", w: 18, h: 16 },
  { slug: "s-403", label: "Picture 403", w: 18, h: 21 },
  { slug: "s-404", label: "Picture 404", w: 16, h: 21 },
  { slug: "s-405", label: "Picture 405", w: 14, h: 21 },
  { slug: "s-406", label: "Picture 406", w: 18, h: 19 },
  { slug: "s-407", label: "Picture 407", w: 19, h: 20 },
  { slug: "s-408", label: "Picture 408", w: 19, h: 19 },
  { slug: "s-409", label: "Picture 409", w: 18, h: 22 },
  { slug: "s-410", label: "Picture 410", w: 21, h: 22 },
  { slug: "s-411", label: "Picture 411", w: 17, h: 20 },
  { slug: "s-412", label: "Picture 412", w: 16, h: 20 },
  { slug: "s-413", label: "Picture 413", w: 11, h: 21 },
  { slug: "s-414", label: "Picture 414", w: 14, h: 21 },
  { slug: "s-415", label: "Picture 415", w: 20, h: 21 },
  { slug: "s-416", label: "Picture 416", w: 20, h: 21 },
  { slug: "s-417", label: "Picture 417", w: 34, h: 37 },
  { slug: "s-418", label: "Picture 418", w: 37, h: 37 },
  { slug: "s-419", label: "Picture 419", w: 37, h: 37 },
  { slug: "s-420", label: "Picture 420", w: 38, h: 37 },
  { slug: "s-421", label: "Picture 421", w: 37, h: 37 },
  { slug: "s-422", label: "Picture 422", w: 37, h: 37 },
  { slug: "s-423", label: "Picture 423", w: 37, h: 37 },
  { slug: "s-424", label: "Picture 424", w: 35, h: 37 },
  { slug: "s-425", label: "Picture 425", w: 37, h: 37 },
  { slug: "s-426", label: "Picture 426", w: 37, h: 37 },
  { slug: "s-427", label: "Picture 427", w: 34, h: 34 },
  { slug: "s-428", label: "Picture 428", w: 37, h: 37 },
  { slug: "s-429", label: "Picture 429", w: 37, h: 37 },
  { slug: "s-430", label: "Picture 430", w: 37, h: 37 },
  { slug: "s-431", label: "Picture 431", w: 37, h: 37 },
  { slug: "s-432", label: "Picture 432", w: 37, h: 37 },
  { slug: "s-433", label: "Picture 433", w: 38, h: 37 },
  { slug: "s-434", label: "Picture 434", w: 37, h: 37 },
  { slug: "s-435", label: "Picture 435", w: 36, h: 36 },
  { slug: "s-436", label: "Picture 436", w: 37, h: 37 },
  { slug: "s-437", label: "Picture 437", w: 38, h: 37 },
  { slug: "s-438", label: "Picture 438", w: 37, h: 35 },
  { slug: "s-439", label: "Picture 439", w: 37, h: 37 },
  { slug: "s-440", label: "Picture 440", w: 37, h: 37 },
  { slug: "s-441", label: "Picture 441", w: 37, h: 37 },
  { slug: "s-442", label: "Picture 442", w: 37, h: 36 },
  { slug: "s-443", label: "Picture 443", w: 35, h: 33 },
  { slug: "s-444", label: "Picture 444", w: 21, h: 21 },
  { slug: "s-445", label: "Picture 445", w: 21, h: 22 },
  { slug: "s-446", label: "Picture 446", w: 21, h: 21 },
  { slug: "s-447", label: "Picture 447", w: 21, h: 21 },
  { slug: "s-448", label: "Picture 448", w: 21, h: 21 },
  { slug: "s-449", label: "Picture 449", w: 21, h: 21 },
  { slug: "s-450", label: "Picture 450", w: 21, h: 21 },
  { slug: "s-451", label: "Picture 451", w: 16, h: 19 },
  { slug: "s-452", label: "Picture 452", w: 16, h: 19 },
  { slug: "s-453", label: "Picture 453", w: 17, h: 18 },
  { slug: "s-454", label: "Picture 454", w: 19, h: 17 },
  { slug: "s-455", label: "Picture 455", w: 17, h: 18 },
  { slug: "s-456", label: "Picture 456", w: 17, h: 18 },
  { slug: "s-457", label: "Picture 457", w: 17, h: 18 },
  { slug: "s-458", label: "Picture 458", w: 17, h: 18 },
  { slug: "s-459", label: "Picture 459", w: 18, h: 18 },
  { slug: "s-460", label: "Picture 460", w: 18, h: 18 },
  { slug: "s-461", label: "Picture 461", w: 18, h: 18 },
  { slug: "s-462", label: "Picture 462", w: 17, h: 17 },
  { slug: "s-463", label: "Picture 463", w: 17, h: 19 },
  { slug: "s-464", label: "Picture 464", w: 17, h: 19 },
  { slug: "s-465", label: "Picture 465", w: 18, h: 17 },
  { slug: "s-466", label: "Picture 466", w: 16, h: 18 },
  { slug: "s-467", label: "Picture 467", w: 17, h: 18 },
  { slug: "s-468", label: "Picture 468", w: 16, h: 16 },
  { slug: "s-469", label: "Picture 469", w: 14, h: 17 },
  { slug: "s-470", label: "Picture 470", w: 19, h: 16 },
  { slug: "s-471", label: "Picture 471", w: 15, h: 16 },
  { slug: "s-472", label: "Picture 472", w: 11, h: 16 },
  { slug: "s-473", label: "Picture 473", w: 12, h: 16 },
  { slug: "s-474", label: "Picture 474", w: 16, h: 16 },
  { slug: "s-475", label: "Picture 475", w: 12, h: 16 },
  { slug: "s-476", label: "Picture 476", w: 12, h: 16 },
  { slug: "s-477", label: "Picture 477", w: 14, h: 16 },
  { slug: "s-478", label: "Picture 478", w: 12, h: 16 },
  { slug: "s-479", label: "Picture 479", w: 19, h: 14 },
  { slug: "s-480", label: "Picture 480", w: 17, h: 17 },
  { slug: "s-481", label: "Picture 481", w: 16, h: 17 },
  { slug: "s-482", label: "Picture 482", w: 17, h: 17 },
  { slug: "s-483", label: "Picture 483", w: 16, h: 15 },
  { slug: "s-484", label: "Picture 484", w: 18, h: 15 },
  { slug: "s-485", label: "Picture 485", w: 12, h: 15 },
  { slug: "s-486", label: "Picture 486", w: 19, h: 16 },
  { slug: "s-487", label: "Picture 487", w: 14, h: 17 },
  { slug: "s-488", label: "Picture 488", w: 14, h: 16 },
  { slug: "s-489", label: "Picture 489", w: 17, h: 16 },
  { slug: "s-490", label: "Picture 490", w: 17, h: 16 },
  { slug: "s-491", label: "Picture 491", w: 13, h: 16 },
  { slug: "s-492", label: "Picture 492", w: 17, h: 9 },
  { slug: "s-493", label: "Picture 493", w: 18, h: 22 },
  { slug: "s-494", label: "Picture 494", w: 19, h: 22 },
  { slug: "s-495", label: "Picture 495", w: 20, h: 20 },
  { slug: "s-496", label: "Picture 496", w: 19, h: 20 },
  { slug: "s-497", label: "Picture 497", w: 16, h: 21 },
  { slug: "s-498", label: "Picture 498", w: 18, h: 22 },
  { slug: "s-499", label: "Picture 499", w: 20, h: 20 },
  { slug: "s-500", label: "Picture 500", w: 16, h: 21 },
  { slug: "s-501", label: "Picture 501", w: 18, h: 21 },
  { slug: "s-502", label: "Picture 502", w: 20, h: 19 },
  { slug: "s-503", label: "Picture 503", w: 20, h: 19 },
  { slug: "s-504", label: "Picture 504", w: 20, h: 22 },
  { slug: "s-505", label: "Picture 505", w: 20, h: 18 },
  { slug: "s-506", label: "Picture 506", w: 20, h: 15 },
  { slug: "s-507", label: "Picture 507", w: 18, h: 21 },
  { slug: "s-508", label: "Picture 508", w: 20, h: 21 },
  { slug: "s-509", label: "Picture 509", w: 20, h: 21 },
] as const;
export type ItemSlug = (typeof ITEMS)[number]["slug"];

/** Where an icon's picture lives: `t-<name>` is a tradable badge, `s-<n>` a picture from the badge set, the rest plain icons. */
export const itemSrc = (slug: string): string =>
  slug.startsWith("t-")
    ? `/badges/tradable/${slug.slice(2)}.png`
    : slug.startsWith("s-")
      ? `/badges/set/${slug.slice(2)}.png`
      : `/badges/items/${slug}.png`;

export const NO_ITEM = "none";

/** The five places an icon can sit. */
export const SLOTS = ["a", "b", "c", "d", "e"] as const;
export type Slot = (typeof SLOTS)[number];

/** Turns are in eighths of a full turn, clockwise: 0 is as drawn, 1 is 45 degrees, 2 is a
 *  quarter turn, up to 7. (The first designs turned in quarters, 0 to 3; they are read as
 *  twice that.) */
export const TURNS = 8;
export type Turn = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Every order five icons can be drawn in, first to last (120 of them). */
function permutations(letters: string): string[] {
  if (letters.length <= 1) return [letters];
  return [...letters].flatMap((c, i) => permutations(letters.slice(0, i) + letters.slice(i + 1)).map((rest) => c + rest));
}
export const ORDERS: readonly string[] = permutations(SLOTS.join("")).sort();
export type Order = string;

/** How many of the icons, counting from the first drawn, sit under the badge shape. */
export type Under = 0 | 1 | 2 | 3 | 4 | 5;

export type TokenDesign = {
  shape: ShapeKey;
  /** 50, 75 or 100: how much of the picture the shape takes. */
  badge_size: BadgeSize;
  /** The shape's own colour. */
  fill: TokenColour;
  /** The band inside the edge, on framed shapes. */
  rim: TokenColour;
  /** The order the icons are drawn in, first to last: the last is on top of the rest. */
  order: Order;
  /** The first this-many icons in `order` are drawn under the badge shape, so only what
   *  hangs out past its edge shows; the others go over it. */
  under: Under;
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
  const none = { flip: false, turn: 0 as Turn, size: 100 as SizeKey, x: 0, y: 0 };
  return {
    shape: "circle-frame",
    badge_size: 100,
    fill: "blu-dark",
    rim: "gold",
    order: SLOTS.join(""),
    under: 0,
    a: "sword", a_flip: false, a_turn: 0, a_size: 100, a_x: 0, a_y: 0,
    b: "sword", b_flip: true, b_turn: 0, b_size: 100, b_x: 0, b_y: 0,
    c: NO_ITEM, c_flip: none.flip, c_turn: none.turn, c_size: none.size, c_x: none.x, c_y: none.y,
    d: NO_ITEM, d_flip: none.flip, d_turn: none.turn, d_size: none.size, d_x: none.x, d_y: none.y,
    e: NO_ITEM, e_flip: none.flip, e_turn: none.turn, e_size: none.size, e_x: none.x, e_y: none.y,
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
export function itemBox(slug: string, t: number, sz: SizeKey): { w: number; h: number } {
  const it = ITEMS.find((i) => i.slug === slug);
  if (!it) return { w: 0, h: 0 };
  const f = sz / 100;
  return turnedBox(Math.max(1, Math.round(it.w * f)), Math.max(1, Math.round(it.h * f)), t);
}

export function itemBounds(slug: string, t: number, sz: SizeKey): { x: number; y: number } {
  if (!ITEMS.some((i) => i.slug === slug)) return { x: 0, y: 0 };
  const box = itemBox(slug, t, sz);
  const C = TOKEN_SIZE / 2;
  return { x: Math.max(0, Math.floor(C - box.w / 2)), y: Math.max(0, Math.floor(C - box.h / 2)) };
}

/** The largest size an icon can be at this turn and still fit inside the picture (a bigger
 *  icon, or one turned on a diagonal, takes more room). */
export function maxSizeFor(slug: string, t: number): SizeKey {
  let best: SizeKey = SIZES[0];
  for (const sz of SIZES) {
    const box = itemBox(slug, t, sz);
    if (box.w <= TOKEN_SIZE && box.h <= TOKEN_SIZE) best = sz;
  }
  return best;
}

/** The draw order and how many icons sit under the shape, from whatever was saved: this
 *  version's `order` and `under`; the one before's `order` of three (or two, from `top`) and a
 *  `_behind` flag on each icon, which becomes "the ones behind come first, under the shape". */
function layering(c: Record<string, unknown>): { order: string; under: Under } {
  const all = SLOTS.join("");
  let order = "";
  if (typeof c.order === "string" && /^[a-e]{1,5}$/.test(c.order) && new Set(c.order).size === c.order.length) order = c.order;
  else if (c.top === "a") order = "ba";
  else order = "ab";
  // Any icon the saved order left out goes after it, in slot order.
  order += [...all].filter((k) => !order.includes(k)).join("");
  if (typeof c.under === "number" && Number.isInteger(c.under) && c.under >= 0 && c.under <= 5 && ORDERS.includes(order)) {
    return { order, under: c.under as Under };
  }
  const behind = [...order].filter((k) => c[`${k}_behind`] === true);
  const front = [...order].filter((k) => c[`${k}_behind`] !== true);
  return { order: [...behind, ...front].join(""), under: behind.length as Under };
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
    // The icons after the first two are new: a design from before them has none rather
    // than the default's.
    const slug = pick(c[k], ITEM_KEYS, k === "a" || k === "b" ? d[k] : NO_ITEM);
    const t = turn(c[`${k}_turn`], c[`${k}_rot`]);
    // Never bigger than fits in the picture: growing, or turning on a diagonal, can run out of room.
    const sz = Math.min(size(c[`${k}_size`]), maxSizeFor(slug, t)) as SizeKey;
    const bounds = itemBounds(slug, t, sz);
    out[k] = slug;
    out[`${k}_flip`] = c[`${k}_flip`] === true;
    out[`${k}_turn`] = t;
    out[`${k}_size`] = sz;
    out[`${k}_x`] = offset(c[`${k}_x`], bounds.x);
    out[`${k}_y`] = offset(c[`${k}_y`], bounds.y);
  }
  Object.assign(out, layering(c));
  return out as TokenDesign;
}

// ------------------------------------------------------------ layers

/** The whole stack, bottom to top, with the badge shape as "#" among the icons. */
export function stackOf(order: string, under: number): string[] {
  return [...order.slice(0, under), "#", ...order.slice(under)];
}
function fromStack(stack: string[]): { order: string; under: Under } {
  return { order: stack.filter((x) => x !== "#").join(""), under: stack.indexOf("#") as Under };
}

/** Put an icon on top of everything. */
export function placeOnTop(d: Pick<TokenDesign, "order" | "under">, slot: Slot): { order: string; under: Under } {
  return fromStack([...stackOf(d.order, d.under).filter((x) => x !== slot), slot]);
}

/** Move an icon one layer up (1) or down (-1) past whatever is next to it that is actually
 *  drawn: another icon, or the badge shape, which puts it behind or in front of the badge.
 *  Null when it is already at that end. */
export function moveLayer(d: TokenDesign, slot: Slot, dir: 1 | -1): { order: string; under: Under } | null {
  const stack = stackOf(d.order, d.under);
  const drawn = (x: string) => (x === "#" ? d.shape !== "none" : d[x as Slot] !== NO_ITEM);
  const i = stack.indexOf(slot);
  let j = i + dir;
  while (j >= 0 && j < stack.length && !drawn(stack[j])) j += dir;
  if (j < 0 || j >= stack.length) return null;
  stack.splice(i, 1);
  stack.splice(j, 0, slot);
  return fromStack(stack);
}

// ------------------------------------------------------------ url packing

/** Bump when the compositor changes: tokens are cached immutably by their packed spec. */
export const TOKEN_RENDER = "9";

/** flip, size and turn of one icon in one number: flip × 64 + size step × 8 + turn, 0–127. */
const flags = (flip: boolean, sz: SizeKey, t: number) => (flip ? 64 : 0) + SIZE_KEYS.indexOf(sz) * 8 + t;
const unflags = (n: number) => ({
  flip: n >= 64,
  size: SIZE_KEYS[Math.floor((n % 64) / 8)] as SizeKey,
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
    parts.push(ITEM_KEYS.indexOf(d[k]), flags(d[`${k}_flip`], d[`${k}_size`], d[`${k}_turn`]), d[`${k}_x`] + OFFSET_MAX, d[`${k}_y`] + OFFSET_MAX);
  }
  parts.push(ORDERS.indexOf(d.order), d.under);
  return [TOKEN_RENDER, ...parts.map((n) => n.toString(36))].join(".");
}

export function unpackToken(packed: string): TokenDesign | null {
  if (packed.length > 120) return null;
  const parts = packed.split(".");
  if (parts.length !== 1 + 4 + 4 * SLOTS.length + 2 || parts[0] !== TOKEN_RENDER) return null;
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
  const nOrder = nums[nums.length - 2];
  const under = nums[nums.length - 1];
  const order = nOrder < ORDERS.length ? ORDERS[nOrder] : null;
  if (!shape || !fill || !rim || !order || nBadge >= BADGE_SIZE_KEYS.length || under > 5) return null;
  const raw: Record<string, unknown> = { shape, badge_size: BADGE_SIZE_KEYS[nBadge], fill, rim, order, under };
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
