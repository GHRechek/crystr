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
  // The rest of the badge-set pictures that fit as icons (24 pixels or less across), last of all.
  { slug: "s-1", label: "Picture 1", w: 23, h: 23 },
  { slug: "s-2", label: "Picture 2", w: 23, h: 23 },
  { slug: "s-3", label: "Picture 3", w: 23, h: 23 },
  { slug: "s-5", label: "Picture 5", w: 23, h: 23 },
  { slug: "s-6", label: "Picture 6", w: 23, h: 23 },
  { slug: "s-7", label: "Picture 7", w: 23, h: 23 },
  { slug: "s-8", label: "Picture 8", w: 23, h: 23 },
  { slug: "s-9", label: "Picture 9", w: 23, h: 24 },
  { slug: "s-10", label: "Picture 10", w: 23, h: 24 },
  { slug: "s-11", label: "Picture 11", w: 23, h: 24 },
  { slug: "s-12", label: "Picture 12", w: 23, h: 24 },
  { slug: "s-14", label: "Picture 14", w: 23, h: 24 },
  { slug: "s-15", label: "Picture 15", w: 23, h: 24 },
  { slug: "s-16", label: "Picture 16", w: 23, h: 24 },
  { slug: "s-17", label: "Picture 17", w: 23, h: 24 },
  { slug: "s-18", label: "Picture 18", w: 23, h: 24 },
  { slug: "s-19", label: "Picture 19", w: 23, h: 24 },
  { slug: "s-20", label: "Picture 20", w: 23, h: 24 },
  { slug: "s-21", label: "Picture 21", w: 23, h: 24 },
  { slug: "s-23", label: "Picture 23", w: 23, h: 24 },
  { slug: "s-24", label: "Picture 24", w: 23, h: 24 },
  { slug: "s-25", label: "Picture 25", w: 23, h: 24 },
  { slug: "s-26", label: "Picture 26", w: 23, h: 24 },
  { slug: "s-27", label: "Picture 27", w: 23, h: 24 },
  { slug: "s-28", label: "Picture 28", w: 23, h: 24 },
  { slug: "s-29", label: "Picture 29", w: 23, h: 24 },
  { slug: "s-30", label: "Picture 30", w: 23, h: 24 },
  { slug: "s-32", label: "Picture 32", w: 23, h: 24 },
  { slug: "s-33", label: "Picture 33", w: 23, h: 24 },
  { slug: "s-34", label: "Picture 34", w: 23, h: 24 },
  { slug: "s-35", label: "Picture 35", w: 23, h: 24 },
  { slug: "s-36", label: "Picture 36", w: 23, h: 23 },
  { slug: "s-37", label: "Picture 37", w: 23, h: 23 },
  { slug: "s-38", label: "Picture 38", w: 23, h: 23 },
  { slug: "s-39", label: "Picture 39", w: 23, h: 23 },
  { slug: "s-40", label: "Picture 40", w: 23, h: 23 },
  { slug: "s-41", label: "Picture 41", w: 24, h: 23 },
  { slug: "s-42", label: "Picture 42", w: 23, h: 23 },
  { slug: "s-43", label: "Picture 43", w: 23, h: 23 },
  { slug: "s-44", label: "Picture 44", w: 23, h: 23 },
  { slug: "s-45", label: "Picture 45", w: 23, h: 23 },
  { slug: "s-46", label: "Picture 46", w: 23, h: 23 },
  { slug: "s-47", label: "Picture 47", w: 23, h: 23 },
  { slug: "s-48", label: "Picture 48", w: 23, h: 23 },
  { slug: "s-49", label: "Picture 49", w: 23, h: 23 },
  { slug: "s-51", label: "Picture 51", w: 23, h: 23 },
  { slug: "s-52", label: "Picture 52", w: 23, h: 23 },
  { slug: "s-53", label: "Picture 53", w: 23, h: 23 },
  { slug: "s-54", label: "Picture 54", w: 23, h: 23 },
  { slug: "s-55", label: "Picture 55", w: 23, h: 24 },
  { slug: "s-56", label: "Picture 56", w: 23, h: 24 },
  { slug: "s-57", label: "Picture 57", w: 23, h: 24 },
  { slug: "s-58", label: "Picture 58", w: 23, h: 24 },
  { slug: "s-60", label: "Picture 60", w: 23, h: 24 },
  { slug: "s-61", label: "Picture 61", w: 23, h: 24 },
  { slug: "s-62", label: "Picture 62", w: 23, h: 24 },
  { slug: "s-63", label: "Picture 63", w: 23, h: 24 },
  { slug: "s-64", label: "Picture 64", w: 23, h: 24 },
  { slug: "s-65", label: "Picture 65", w: 23, h: 24 },
  { slug: "s-66", label: "Picture 66", w: 23, h: 24 },
  { slug: "s-67", label: "Picture 67", w: 23, h: 24 },
  { slug: "s-69", label: "Picture 69", w: 23, h: 24 },
  { slug: "s-70", label: "Picture 70", w: 23, h: 24 },
  { slug: "s-71", label: "Picture 71", w: 23, h: 24 },
  { slug: "s-72", label: "Picture 72", w: 23, h: 24 },
  { slug: "s-73", label: "Picture 73", w: 23, h: 24 },
  { slug: "s-74", label: "Picture 74", w: 23, h: 24 },
  { slug: "s-75", label: "Picture 75", w: 23, h: 24 },
  { slug: "s-76", label: "Picture 76", w: 23, h: 24 },
  { slug: "s-78", label: "Picture 78", w: 23, h: 24 },
  { slug: "s-79", label: "Picture 79", w: 23, h: 24 },
  { slug: "s-80", label: "Picture 80", w: 23, h: 24 },
  { slug: "s-81", label: "Picture 81", w: 23, h: 24 },
  { slug: "s-82", label: "Picture 82", w: 23, h: 23 },
  { slug: "s-83", label: "Picture 83", w: 23, h: 23 },
  { slug: "s-84", label: "Picture 84", w: 23, h: 23 },
  { slug: "s-85", label: "Picture 85", w: 23, h: 23 },
  { slug: "s-86", label: "Picture 86", w: 24, h: 23 },
  { slug: "s-87", label: "Picture 87", w: 23, h: 23 },
  { slug: "s-88", label: "Picture 88", w: 23, h: 23 },
  { slug: "s-89", label: "Picture 89", w: 23, h: 23 },
  { slug: "s-90", label: "Picture 90", w: 23, h: 23 },
  { slug: "s-91", label: "Picture 91", w: 23, h: 23 },
  { slug: "s-92", label: "Picture 92", w: 21, h: 21 },
  { slug: "s-93", label: "Picture 93", w: 21, h: 21 },
  { slug: "s-94", label: "Picture 94", w: 21, h: 21 },
  { slug: "s-95", label: "Picture 95", w: 21, h: 21 },
  { slug: "s-96", label: "Picture 96", w: 20, h: 21 },
  { slug: "s-97", label: "Picture 97", w: 20, h: 21 },
  { slug: "s-98", label: "Picture 98", w: 21, h: 21 },
  { slug: "s-99", label: "Picture 99", w: 21, h: 21 },
  { slug: "s-100", label: "Picture 100", w: 20, h: 21 },
  { slug: "s-101", label: "Picture 101", w: 21, h: 21 },
  { slug: "s-102", label: "Picture 102", w: 21, h: 21 },
  { slug: "s-103", label: "Picture 103", w: 21, h: 21 },
  { slug: "s-104", label: "Picture 104", w: 21, h: 19 },
  { slug: "s-105", label: "Picture 105", w: 19, h: 21 },
  { slug: "s-106", label: "Picture 106", w: 20, h: 19 },
  { slug: "s-107", label: "Picture 107", w: 20, h: 19 },
  { slug: "s-108", label: "Picture 108", w: 21, h: 19 },
  { slug: "s-109", label: "Picture 109", w: 20, h: 21 },
  { slug: "s-110", label: "Picture 110", w: 21, h: 19 },
  { slug: "s-111", label: "Picture 111", w: 21, h: 19 },
  { slug: "s-112", label: "Picture 112", w: 21, h: 21 },
  { slug: "s-113", label: "Picture 113", w: 21, h: 21 },
  { slug: "s-114", label: "Picture 114", w: 20, h: 21 },
  { slug: "s-115", label: "Picture 115", w: 21, h: 21 },
  { slug: "s-116", label: "Picture 116", w: 20, h: 21 },
  { slug: "s-117", label: "Picture 117", w: 20, h: 21 },
  { slug: "s-118", label: "Picture 118", w: 20, h: 20 },
  { slug: "s-119", label: "Picture 119", w: 21, h: 21 },
  { slug: "s-120", label: "Picture 120", w: 21, h: 21 },
  { slug: "s-121", label: "Picture 121", w: 19, h: 20 },
  { slug: "s-122", label: "Picture 122", w: 21, h: 21 },
  { slug: "s-123", label: "Picture 123", w: 21, h: 21 },
  { slug: "s-124", label: "Picture 124", w: 21, h: 21 },
  { slug: "s-125", label: "Picture 125", w: 21, h: 21 },
  { slug: "s-126", label: "Picture 126", w: 22, h: 21 },
  { slug: "s-127", label: "Picture 127", w: 20, h: 20 },
  { slug: "s-128", label: "Picture 128", w: 21, h: 21 },
  { slug: "s-129", label: "Picture 129", w: 21, h: 21 },
  { slug: "s-130", label: "Picture 130", w: 21, h: 21 },
  { slug: "s-131", label: "Picture 131", w: 21, h: 21 },
  { slug: "s-132", label: "Picture 132", w: 21, h: 21 },
  { slug: "s-133", label: "Picture 133", w: 21, h: 21 },
  { slug: "s-134", label: "Picture 134", w: 21, h: 21 },
  { slug: "s-135", label: "Picture 135", w: 21, h: 21 },
  { slug: "s-136", label: "Picture 136", w: 22, h: 21 },
  { slug: "s-137", label: "Picture 137", w: 20, h: 19 },
  { slug: "s-138", label: "Picture 138", w: 21, h: 21 },
  { slug: "s-139", label: "Picture 139", w: 21, h: 21 },
  { slug: "s-140", label: "Picture 140", w: 21, h: 21 },
  { slug: "s-141", label: "Picture 141", w: 21, h: 21 },
  { slug: "s-142", label: "Picture 142", w: 21, h: 21 },
  { slug: "s-143", label: "Picture 143", w: 21, h: 21 },
  { slug: "s-144", label: "Picture 144", w: 21, h: 21 },
  { slug: "s-145", label: "Picture 145", w: 21, h: 21 },
  { slug: "s-146", label: "Picture 146", w: 21, h: 21 },
  { slug: "s-147", label: "Picture 147", w: 22, h: 21 },
  { slug: "s-148", label: "Picture 148", w: 21, h: 21 },
  { slug: "s-149", label: "Picture 149", w: 22, h: 21 },
  { slug: "s-150", label: "Picture 150", w: 21, h: 21 },
  { slug: "s-151", label: "Picture 151", w: 21, h: 21 },
  { slug: "s-152", label: "Picture 152", w: 21, h: 21 },
  { slug: "s-153", label: "Picture 153", w: 21, h: 21 },
  { slug: "s-154", label: "Picture 154", w: 21, h: 21 },
  { slug: "s-155", label: "Picture 155", w: 21, h: 21 },
  { slug: "s-156", label: "Picture 156", w: 21, h: 21 },
  { slug: "s-157", label: "Picture 157", w: 22, h: 21 },
  { slug: "s-158", label: "Picture 158", w: 21, h: 21 },
  { slug: "s-159", label: "Picture 159", w: 21, h: 21 },
  { slug: "s-160", label: "Picture 160", w: 21, h: 21 },
  { slug: "s-161", label: "Picture 161", w: 21, h: 21 },
  { slug: "s-162", label: "Picture 162", w: 21, h: 21 },
  { slug: "s-163", label: "Picture 163", w: 21, h: 21 },
  { slug: "s-164", label: "Picture 164", w: 21, h: 21 },
  { slug: "s-165", label: "Picture 165", w: 21, h: 21 },
  { slug: "s-166", label: "Picture 166", w: 21, h: 21 },
  { slug: "s-167", label: "Picture 167", w: 21, h: 21 },
  { slug: "s-168", label: "Picture 168", w: 21, h: 21 },
  { slug: "s-169", label: "Picture 169", w: 22, h: 21 },
  { slug: "s-170", label: "Picture 170", w: 21, h: 21 },
  { slug: "s-171", label: "Picture 171", w: 21, h: 21 },
  { slug: "s-172", label: "Picture 172", w: 21, h: 21 },
  { slug: "s-173", label: "Picture 173", w: 21, h: 21 },
  { slug: "s-174", label: "Picture 174", w: 21, h: 21 },
  { slug: "s-175", label: "Picture 175", w: 21, h: 21 },
  { slug: "s-176", label: "Picture 176", w: 22, h: 21 },
  { slug: "s-177", label: "Picture 177", w: 21, h: 21 },
  { slug: "s-178", label: "Picture 178", w: 21, h: 21 },
  { slug: "s-179", label: "Picture 179", w: 21, h: 21 },
  { slug: "s-180", label: "Picture 180", w: 21, h: 21 },
  { slug: "s-181", label: "Picture 181", w: 21, h: 21 },
  { slug: "s-182", label: "Picture 182", w: 21, h: 21 },
  { slug: "s-183", label: "Picture 183", w: 21, h: 21 },
  { slug: "s-184", label: "Picture 184", w: 21, h: 21 },
  { slug: "s-185", label: "Picture 185", w: 21, h: 21 },
  { slug: "s-186", label: "Picture 186", w: 21, h: 21 },
  { slug: "s-187", label: "Picture 187", w: 21, h: 21 },
  { slug: "s-188", label: "Picture 188", w: 21, h: 21 },
  { slug: "s-189", label: "Picture 189", w: 21, h: 21 },
  { slug: "s-190", label: "Picture 190", w: 21, h: 21 },
  { slug: "s-191", label: "Picture 191", w: 21, h: 21 },
  { slug: "s-192", label: "Picture 192", w: 16, h: 17 },
  { slug: "s-193", label: "Picture 193", w: 16, h: 17 },
  { slug: "s-194", label: "Picture 194", w: 14, h: 17 },
  { slug: "s-195", label: "Picture 195", w: 15, h: 15 },
  { slug: "s-196", label: "Picture 196", w: 16, h: 15 },
  { slug: "s-197", label: "Picture 197", w: 14, h: 15 },
  { slug: "s-198", label: "Picture 198", w: 16, h: 13 },
  { slug: "s-199", label: "Picture 199", w: 14, h: 13 },
  { slug: "s-200", label: "Picture 200", w: 12, h: 13 },
  { slug: "s-201", label: "Picture 201", w: 15, h: 14 },
  { slug: "s-202", label: "Picture 202", w: 14, h: 14 },
  { slug: "s-203", label: "Picture 203", w: 16, h: 14 },
  { slug: "s-204", label: "Picture 204", w: 16, h: 15 },
  { slug: "s-205", label: "Picture 205", w: 14, h: 15 },
  { slug: "s-206", label: "Picture 206", w: 14, h: 15 },
  { slug: "s-207", label: "Picture 207", w: 14, h: 15 },
  { slug: "s-208", label: "Picture 208", w: 10, h: 15 },
  { slug: "s-209", label: "Picture 209", w: 16, h: 15 },
  { slug: "s-210", label: "Picture 210", w: 15, h: 14 },
  { slug: "s-211", label: "Picture 211", w: 12, h: 15 },
  { slug: "s-212", label: "Picture 212", w: 16, h: 14 },
  { slug: "s-213", label: "Picture 213", w: 14, h: 15 },
  { slug: "s-214", label: "Picture 214", w: 15, h: 15 },
  { slug: "s-215", label: "Picture 215", w: 16, h: 13 },
  { slug: "s-216", label: "Picture 216", w: 14, h: 15 },
  { slug: "s-217", label: "Picture 217", w: 14, h: 14 },
  { slug: "s-218", label: "Picture 218", w: 16, h: 14 },
  { slug: "s-219", label: "Picture 219", w: 10, h: 14 },
  { slug: "s-220", label: "Picture 220", w: 16, h: 14 },
  { slug: "s-221", label: "Picture 221", w: 14, h: 14 },
  { slug: "s-222", label: "Picture 222", w: 14, h: 14 },
  { slug: "s-223", label: "Picture 223", w: 15, h: 15 },
  { slug: "s-224", label: "Picture 224", w: 10, h: 14 },
  { slug: "s-225", label: "Picture 225", w: 14, h: 14 },
  { slug: "s-226", label: "Picture 226", w: 14, h: 14 },
  { slug: "s-227", label: "Picture 227", w: 14, h: 14 },
  { slug: "s-228", label: "Picture 228", w: 15, h: 15 },
  { slug: "s-229", label: "Picture 229", w: 10, h: 15 },
  { slug: "s-230", label: "Picture 230", w: 10, h: 15 },
  { slug: "s-231", label: "Picture 231", w: 13, h: 15 },
  { slug: "s-232", label: "Picture 232", w: 16, h: 15 },
  { slug: "s-233", label: "Picture 233", w: 15, h: 15 },
  { slug: "s-234", label: "Picture 234", w: 16, h: 15 },
  { slug: "s-235", label: "Picture 235", w: 16, h: 15 },
  { slug: "s-236", label: "Picture 236", w: 16, h: 15 },
  { slug: "s-237", label: "Picture 237", w: 14, h: 15 },
  { slug: "s-238", label: "Picture 238", w: 16, h: 15 },
  { slug: "s-239", label: "Picture 239", w: 16, h: 15 },
  { slug: "s-240", label: "Picture 240", w: 16, h: 15 },
  { slug: "s-241", label: "Picture 241", w: 16, h: 15 },
  { slug: "s-242", label: "Picture 242", w: 16, h: 15 },
  { slug: "s-243", label: "Picture 243", w: 15, h: 15 },
  { slug: "s-244", label: "Picture 244", w: 14, h: 15 },
  { slug: "s-245", label: "Picture 245", w: 16, h: 15 },
  { slug: "s-246", label: "Picture 246", w: 15, h: 15 },
  { slug: "s-247", label: "Picture 247", w: 15, h: 15 },
  { slug: "s-248", label: "Picture 248", w: 15, h: 15 },
  { slug: "s-249", label: "Picture 249", w: 14, h: 15 },
  { slug: "s-250", label: "Picture 250", w: 12, h: 15 },
  { slug: "s-251", label: "Picture 251", w: 14, h: 14 },
  { slug: "s-252", label: "Picture 252", w: 14, h: 14 },
  { slug: "s-253", label: "Picture 253", w: 14, h: 14 },
  { slug: "s-254", label: "Picture 254", w: 16, h: 15 },
  { slug: "s-255", label: "Picture 255", w: 15, h: 13 },
  { slug: "s-256", label: "Picture 256", w: 14, h: 12 },
  { slug: "s-257", label: "Picture 257", w: 14, h: 12 },
  { slug: "s-258", label: "Picture 258", w: 14, h: 12 },
  { slug: "s-259", label: "Picture 259", w: 14, h: 12 },
  { slug: "s-260", label: "Picture 260", w: 14, h: 12 },
  { slug: "s-261", label: "Picture 261", w: 14, h: 12 },
  { slug: "s-262", label: "Picture 262", w: 14, h: 11 },
  { slug: "s-263", label: "Picture 263", w: 14, h: 15 },
  { slug: "s-264", label: "Picture 264", w: 16, h: 16 },
  { slug: "s-265", label: "Picture 265", w: 12, h: 16 },
  { slug: "s-266", label: "Picture 266", w: 16, h: 15 },
  { slug: "s-267", label: "Picture 267", w: 16, h: 15 },
  { slug: "s-268", label: "Picture 268", w: 16, h: 15 },
  { slug: "s-269", label: "Picture 269", w: 16, h: 15 },
  { slug: "s-270", label: "Picture 270", w: 16, h: 15 },
  { slug: "s-271", label: "Picture 271", w: 16, h: 16 },
  { slug: "s-272", label: "Picture 272", w: 14, h: 14 },
  { slug: "s-273", label: "Picture 273", w: 13, h: 13 },
  { slug: "s-274", label: "Picture 274", w: 14, h: 13 },
  { slug: "s-275", label: "Picture 275", w: 19, h: 21 },
  { slug: "s-276", label: "Picture 276", w: 19, h: 20 },
  { slug: "s-277", label: "Picture 277", w: 20, h: 20 },
  { slug: "s-278", label: "Picture 278", w: 19, h: 20 },
  { slug: "s-279", label: "Picture 279", w: 20, h: 20 },
  { slug: "s-280", label: "Picture 280", w: 20, h: 20 },
  { slug: "s-281", label: "Picture 281", w: 20, h: 20 },
  { slug: "s-282", label: "Picture 282", w: 20, h: 20 },
  { slug: "s-283", label: "Picture 283", w: 20, h: 20 },
  { slug: "s-284", label: "Picture 284", w: 19, h: 20 },
  { slug: "s-285", label: "Picture 285", w: 19, h: 21 },
  { slug: "s-286", label: "Picture 286", w: 19, h: 20 },
  { slug: "s-287", label: "Picture 287", w: 20, h: 20 },
  { slug: "s-288", label: "Picture 288", w: 19, h: 20 },
  { slug: "s-289", label: "Picture 289", w: 20, h: 20 },
  { slug: "s-290", label: "Picture 290", w: 19, h: 20 },
  { slug: "s-291", label: "Picture 291", w: 20, h: 20 },
  { slug: "s-292", label: "Picture 292", w: 19, h: 20 },
  { slug: "s-293", label: "Picture 293", w: 20, h: 20 },
  { slug: "s-294", label: "Picture 294", w: 19, h: 20 },
  { slug: "s-295", label: "Picture 295", w: 19, h: 20 },
  { slug: "s-296", label: "Picture 296", w: 20, h: 20 },
  { slug: "s-297", label: "Picture 297", w: 19, h: 20 },
  { slug: "s-298", label: "Picture 298", w: 19, h: 20 },
  { slug: "s-299", label: "Picture 299", w: 20, h: 19 },
  { slug: "s-510", label: "Picture 510", w: 19, h: 19 },
  { slug: "s-511", label: "Picture 511", w: 18, h: 20 },
  { slug: "s-512", label: "Picture 512", w: 20, h: 20 },
  { slug: "s-513", label: "Picture 513", w: 19, h: 20 },
  { slug: "s-514", label: "Picture 514", w: 20, h: 20 },
  { slug: "s-515", label: "Picture 515", w: 20, h: 20 },
  { slug: "s-516", label: "Picture 516", w: 20, h: 20 },
  { slug: "s-517", label: "Picture 517", w: 20, h: 20 },
  { slug: "s-518", label: "Picture 518", w: 20, h: 20 },
  { slug: "s-519", label: "Picture 519", w: 20, h: 20 },
  { slug: "s-520", label: "Picture 520", w: 18, h: 20 },
  { slug: "s-521", label: "Picture 521", w: 20, h: 20 },
  { slug: "s-522", label: "Picture 522", w: 19, h: 20 },
  { slug: "s-523", label: "Picture 523", w: 15, h: 19 },
  { slug: "s-524", label: "Picture 524", w: 17, h: 18 },
  { slug: "s-525", label: "Picture 525", w: 14, h: 19 },
  { slug: "s-526", label: "Picture 526", w: 17, h: 19 },
  { slug: "s-527", label: "Picture 527", w: 15, h: 19 },
  { slug: "s-528", label: "Picture 528", w: 17, h: 17 },
  { slug: "s-529", label: "Picture 529", w: 17, h: 17 },
  { slug: "s-530", label: "Picture 530", w: 15, h: 15 },
  { slug: "s-531", label: "Picture 531", w: 14, h: 19 },
  { slug: "s-532", label: "Picture 532", w: 17, h: 18 },
  { slug: "s-533", label: "Picture 533", w: 16, h: 18 },
  { slug: "s-534", label: "Picture 534", w: 17, h: 18 },
  { slug: "s-535", label: "Picture 535", w: 17, h: 18 },
  { slug: "s-536", label: "Picture 536", w: 17, h: 18 },
  { slug: "s-537", label: "Picture 537", w: 13, h: 18 },
  { slug: "s-538", label: "Picture 538", w: 17, h: 18 },
  { slug: "s-539", label: "Picture 539", w: 17, h: 18 },
  { slug: "s-540", label: "Picture 540", w: 17, h: 18 },
  { slug: "s-541", label: "Picture 541", w: 13, h: 16 },
  { slug: "s-542", label: "Picture 542", w: 15, h: 15 },
  { slug: "s-543", label: "Picture 543", w: 17, h: 19 },
  { slug: "s-544", label: "Picture 544", w: 17, h: 19 },
  { slug: "s-545", label: "Picture 545", w: 17, h: 19 },
  { slug: "s-546", label: "Picture 546", w: 17, h: 19 },
  { slug: "s-547", label: "Picture 547", w: 18, h: 19 },
  { slug: "s-548", label: "Picture 548", w: 17, h: 19 },
  { slug: "s-549", label: "Picture 549", w: 17, h: 19 },
  { slug: "s-550", label: "Picture 550", w: 16, h: 18 },
  { slug: "s-551", label: "Picture 551", w: 17, h: 18 },
  { slug: "s-552", label: "Picture 552", w: 16, h: 18 },
  { slug: "s-553", label: "Picture 553", w: 17, h: 18 },
  { slug: "s-554", label: "Picture 554", w: 13, h: 16 },
  { slug: "s-555", label: "Picture 555", w: 17, h: 19 },
  { slug: "s-556", label: "Picture 556", w: 17, h: 19 },
  { slug: "s-557", label: "Picture 557", w: 17, h: 19 },
  { slug: "s-558", label: "Picture 558", w: 18, h: 19 },
  { slug: "s-559", label: "Picture 559", w: 17, h: 19 },
  { slug: "s-560", label: "Picture 560", w: 17, h: 19 },
  { slug: "s-561", label: "Picture 561", w: 17, h: 19 },
  { slug: "s-562", label: "Picture 562", w: 17, h: 19 },
  { slug: "s-563", label: "Picture 563", w: 17, h: 19 },
  { slug: "s-564", label: "Picture 564", w: 17, h: 20 },
  { slug: "s-565", label: "Picture 565", w: 15, h: 18 },
  { slug: "s-566", label: "Picture 566", w: 16, h: 19 },
  { slug: "s-567", label: "Picture 567", w: 17, h: 18 },
  { slug: "s-568", label: "Picture 568", w: 17, h: 18 },
  { slug: "s-569", label: "Picture 569", w: 19, h: 19 },
  { slug: "s-570", label: "Picture 570", w: 17, h: 18 },
  { slug: "s-571", label: "Picture 571", w: 17, h: 18 },
  { slug: "s-572", label: "Picture 572", w: 18, h: 18 },
  { slug: "s-573", label: "Picture 573", w: 17, h: 18 },
  { slug: "s-574", label: "Picture 574", w: 17, h: 18 },
  { slug: "s-575", label: "Picture 575", w: 17, h: 18 },
  { slug: "s-576", label: "Picture 576", w: 17, h: 18 },
  { slug: "s-577", label: "Picture 577", w: 17, h: 18 },
  { slug: "s-578", label: "Picture 578", w: 18, h: 18 },
  { slug: "s-579", label: "Picture 579", w: 16, h: 17 },
  { slug: "s-580", label: "Picture 580", w: 18, h: 17 },
  { slug: "s-581", label: "Picture 581", w: 18, h: 17 },
  { slug: "s-582", label: "Picture 582", w: 18, h: 17 },
  { slug: "s-583", label: "Picture 583", w: 18, h: 17 },
  { slug: "s-584", label: "Picture 584", w: 12, h: 17 },
  { slug: "s-585", label: "Picture 585", w: 14, h: 17 },
  { slug: "s-586", label: "Picture 586", w: 16, h: 17 },
  { slug: "s-587", label: "Picture 587", w: 16, h: 17 },
  { slug: "s-588", label: "Picture 588", w: 16, h: 17 },
  { slug: "s-589", label: "Picture 589", w: 17, h: 17 },
  { slug: "s-590", label: "Picture 590", w: 17, h: 17 },
  { slug: "s-591", label: "Picture 591", w: 14, h: 15 },
  { slug: "s-592", label: "Picture 592", w: 14, h: 13 },
  { slug: "s-593", label: "Picture 593", w: 16, h: 13 },
  { slug: "s-594", label: "Picture 594", w: 16, h: 13 },
  { slug: "s-595", label: "Picture 595", w: 16, h: 13 },
  { slug: "s-596", label: "Picture 596", w: 16, h: 17 },
  { slug: "s-597", label: "Picture 597", w: 16, h: 16 },
  { slug: "s-598", label: "Picture 598", w: 16, h: 16 },
  { slug: "s-599", label: "Picture 599", w: 18, h: 16 },
  { slug: "s-600", label: "Picture 600", w: 16, h: 16 },
  { slug: "s-601", label: "Picture 601", w: 14, h: 16 },
  { slug: "s-602", label: "Picture 602", w: 18, h: 16 },
  { slug: "s-603", label: "Picture 603", w: 18, h: 16 },
  { slug: "s-604", label: "Picture 604", w: 16, h: 15 },
  { slug: "s-605", label: "Picture 605", w: 12, h: 15 },
  { slug: "s-606", label: "Picture 606", w: 12, h: 15 },
  { slug: "s-607", label: "Picture 607", w: 12, h: 15 },
  { slug: "s-608", label: "Picture 608", w: 18, h: 17 },
  { slug: "s-609", label: "Picture 609", w: 18, h: 16 },
  { slug: "s-610", label: "Picture 610", w: 14, h: 16 },
  { slug: "s-611", label: "Picture 611", w: 14, h: 16 },
  { slug: "s-612", label: "Picture 612", w: 18, h: 16 },
  { slug: "s-613", label: "Picture 613", w: 18, h: 10 },
  { slug: "s-614", label: "Picture 614", w: 18, h: 17 },
  { slug: "s-615", label: "Picture 615", w: 14, h: 16 },
  { slug: "s-616", label: "Picture 616", w: 14, h: 17 },
  { slug: "s-617", label: "Picture 617", w: 18, h: 17 },
  { slug: "s-618", label: "Picture 618", w: 18, h: 17 },
  { slug: "s-619", label: "Picture 619", w: 14, h: 16 },
  { slug: "s-620", label: "Picture 620", w: 16, h: 16 },
  { slug: "s-621", label: "Picture 621", w: 10, h: 14 },
  { slug: "s-622", label: "Picture 622", w: 16, h: 17 },
  { slug: "s-623", label: "Picture 623", w: 18, h: 16 },
  { slug: "s-624", label: "Picture 624", w: 17, h: 16 },
  { slug: "s-625", label: "Picture 625", w: 17, h: 17 },
  { slug: "s-626", label: "Picture 626", w: 18, h: 16 },
  { slug: "s-627", label: "Picture 627", w: 16, h: 16 },
  { slug: "s-628", label: "Picture 628", w: 16, h: 16 },
  { slug: "s-629", label: "Picture 629", w: 16, h: 16 },
  { slug: "s-630", label: "Picture 630", w: 18, h: 17 },
  { slug: "s-631", label: "Picture 631", w: 18, h: 17 },
  { slug: "s-632", label: "Picture 632", w: 18, h: 17 },
  { slug: "s-633", label: "Picture 633", w: 18, h: 17 },
  { slug: "s-634", label: "Picture 634", w: 14, h: 17 },
  { slug: "s-635", label: "Picture 635", w: 18, h: 17 },
  { slug: "s-636", label: "Picture 636", w: 18, h: 13 },
  { slug: "s-637", label: "Picture 637", w: 19, h: 21 },
  { slug: "s-638", label: "Picture 638", w: 17, h: 21 },
  { slug: "s-639", label: "Picture 639", w: 19, h: 20 },
  { slug: "s-640", label: "Picture 640", w: 19, h: 20 },
  { slug: "s-641", label: "Picture 641", w: 20, h: 20 },
  { slug: "s-642", label: "Picture 642", w: 20, h: 20 },
  { slug: "s-643", label: "Picture 643", w: 20, h: 21 },
  { slug: "s-644", label: "Picture 644", w: 18, h: 21 },
  { slug: "s-645", label: "Picture 645", w: 20, h: 19 },
  { slug: "s-646", label: "Picture 646", w: 20, h: 20 },
  { slug: "s-647", label: "Picture 647", w: 20, h: 20 },
  { slug: "s-648", label: "Picture 648", w: 20, h: 20 },
  { slug: "s-649", label: "Picture 649", w: 20, h: 20 },
  { slug: "s-650", label: "Picture 650", w: 18, h: 19 },
  { slug: "s-651", label: "Picture 651", w: 21, h: 20 },
  { slug: "s-652", label: "Picture 652", w: 21, h: 20 },
  { slug: "s-653", label: "Picture 653", w: 21, h: 20 },
  { slug: "s-654", label: "Picture 654", w: 21, h: 20 },
  { slug: "s-655", label: "Picture 655", w: 21, h: 20 },
  { slug: "s-656", label: "Picture 656", w: 20, h: 20 },
  { slug: "s-657", label: "Picture 657", w: 20, h: 20 },
  { slug: "s-658", label: "Picture 658", w: 20, h: 20 },
  { slug: "s-659", label: "Picture 659", w: 21, h: 21 },
  { slug: "s-660", label: "Picture 660", w: 21, h: 21 },
  { slug: "s-661", label: "Picture 661", w: 21, h: 21 },
  { slug: "s-662", label: "Picture 662", w: 21, h: 21 },
  { slug: "s-663", label: "Picture 663", w: 20, h: 21 },
  { slug: "s-664", label: "Picture 664", w: 21, h: 21 },
  { slug: "s-665", label: "Picture 665", w: 20, h: 21 },
  { slug: "s-666", label: "Picture 666", w: 18, h: 21 },
  { slug: "s-667", label: "Picture 667", w: 21, h: 20 },
  { slug: "s-668", label: "Picture 668", w: 21, h: 20 },
  { slug: "s-669", label: "Picture 669", w: 21, h: 20 },
  { slug: "s-670", label: "Picture 670", w: 21, h: 20 },
  { slug: "s-671", label: "Picture 671", w: 21, h: 20 },
  { slug: "s-672", label: "Picture 672", w: 20, h: 20 },
  { slug: "s-673", label: "Picture 673", w: 20, h: 20 },
  { slug: "s-674", label: "Picture 674", w: 20, h: 20 },
  { slug: "s-675", label: "Picture 675", w: 20, h: 19 },
  { slug: "s-676", label: "Picture 676", w: 17, h: 18 },
  { slug: "s-677", label: "Picture 677", w: 18, h: 18 },
  { slug: "s-678", label: "Picture 678", w: 18, h: 17 },
  { slug: "s-679", label: "Picture 679", w: 12, h: 18 },
  { slug: "s-680", label: "Picture 680", w: 12, h: 18 },
  { slug: "s-681", label: "Picture 681", w: 12, h: 18 },
  { slug: "s-682", label: "Picture 682", w: 13, h: 18 },
  { slug: "s-683", label: "Picture 683", w: 15, h: 18 },
  { slug: "s-684", label: "Picture 684", w: 16, h: 14 },
  { slug: "s-685", label: "Picture 685", w: 16, h: 14 },
  { slug: "s-686", label: "Picture 686", w: 18, h: 19 },
  { slug: "s-687", label: "Picture 687", w: 20, h: 16 },
  { slug: "s-688", label: "Picture 688", w: 16, h: 14 },
  { slug: "s-689", label: "Picture 689", w: 17, h: 15 },
  { slug: "s-690", label: "Picture 690", w: 20, h: 18 },
  { slug: "s-691", label: "Picture 691", w: 19, h: 18 },
  { slug: "s-692", label: "Picture 692", w: 19, h: 18 },
  { slug: "s-693", label: "Picture 693", w: 19, h: 18 },
  { slug: "s-694", label: "Picture 694", w: 19, h: 18 },
  { slug: "s-695", label: "Picture 695", w: 19, h: 18 },
  { slug: "s-696", label: "Picture 696", w: 17, h: 17 },
  { slug: "s-697", label: "Picture 697", w: 18, h: 17 },
  { slug: "s-698", label: "Picture 698", w: 17, h: 17 },
  { slug: "s-699", label: "Picture 699", w: 17, h: 17 },
  { slug: "s-700", label: "Picture 700", w: 17, h: 17 },
  { slug: "s-701", label: "Picture 701", w: 16, h: 17 },
  { slug: "s-702", label: "Picture 702", w: 17, h: 17 },
  { slug: "s-703", label: "Picture 703", w: 17, h: 17 },
  { slug: "s-704", label: "Picture 704", w: 17, h: 17 },
  { slug: "s-705", label: "Picture 705", w: 19, h: 17 },
  { slug: "s-706", label: "Picture 706", w: 19, h: 17 },
  { slug: "s-707", label: "Picture 707", w: 21, h: 21 },
  { slug: "s-708", label: "Picture 708", w: 21, h: 21 },
  { slug: "s-709", label: "Picture 709", w: 21, h: 21 },
  { slug: "s-710", label: "Picture 710", w: 21, h: 21 },
  { slug: "s-711", label: "Picture 711", w: 21, h: 21 },
  { slug: "s-712", label: "Picture 712", w: 22, h: 21 },
  { slug: "s-713", label: "Picture 713", w: 21, h: 21 },
  { slug: "s-714", label: "Picture 714", w: 21, h: 21 },
  { slug: "s-715", label: "Picture 715", w: 21, h: 21 },
  { slug: "s-716", label: "Picture 716", w: 21, h: 21 },
  { slug: "s-717", label: "Picture 717", w: 21, h: 21 },
  { slug: "s-718", label: "Picture 718", w: 21, h: 21 },
  { slug: "s-719", label: "Picture 719", w: 22, h: 21 },
  { slug: "s-720", label: "Picture 720", w: 21, h: 21 },
  { slug: "s-721", label: "Picture 721", w: 21, h: 21 },
  { slug: "s-722", label: "Picture 722", w: 21, h: 21 },
  { slug: "s-723", label: "Picture 723", w: 21, h: 21 },
  { slug: "s-724", label: "Picture 724", w: 21, h: 21 },
  { slug: "s-725", label: "Picture 725", w: 21, h: 21 },
  { slug: "s-726", label: "Picture 726", w: 21, h: 21 },
  { slug: "s-727", label: "Picture 727", w: 21, h: 21 },
  { slug: "s-728", label: "Picture 728", w: 22, h: 21 },
  { slug: "s-729", label: "Picture 729", w: 21, h: 21 },
  { slug: "s-730", label: "Picture 730", w: 21, h: 21 },
  { slug: "s-731", label: "Picture 731", w: 21, h: 21 },
  { slug: "s-732", label: "Picture 732", w: 21, h: 21 },
  { slug: "s-733", label: "Picture 733", w: 21, h: 21 },
  { slug: "s-734", label: "Picture 734", w: 22, h: 21 },
  { slug: "s-735", label: "Picture 735", w: 21, h: 21 },
  { slug: "s-736", label: "Picture 736", w: 21, h: 21 },
  { slug: "s-737", label: "Picture 737", w: 21, h: 21 },
  { slug: "s-738", label: "Picture 738", w: 21, h: 21 },
  { slug: "s-739", label: "Picture 739", w: 21, h: 21 },
  { slug: "s-740", label: "Picture 740", w: 21, h: 21 },
  { slug: "s-741", label: "Picture 741", w: 21, h: 21 },
  { slug: "s-742", label: "Picture 742", w: 21, h: 21 },
  { slug: "s-743", label: "Picture 743", w: 21, h: 21 },
  { slug: "s-744", label: "Picture 744", w: 21, h: 21 },
  { slug: "s-745", label: "Picture 745", w: 21, h: 21 },
  { slug: "s-746", label: "Picture 746", w: 21, h: 21 },
  { slug: "s-747", label: "Picture 747", w: 23, h: 23 },
  { slug: "s-748", label: "Picture 748", w: 23, h: 23 },
  { slug: "s-749", label: "Picture 749", w: 23, h: 23 },
  { slug: "s-750", label: "Picture 750", w: 23, h: 23 },
  { slug: "s-752", label: "Picture 752", w: 23, h: 23 },
  { slug: "s-753", label: "Picture 753", w: 23, h: 23 },
  { slug: "s-754", label: "Picture 754", w: 23, h: 23 },
  { slug: "s-755", label: "Picture 755", w: 23, h: 23 },
  { slug: "s-756", label: "Picture 756", w: 23, h: 24 },
  { slug: "s-757", label: "Picture 757", w: 23, h: 24 },
  { slug: "s-758", label: "Picture 758", w: 23, h: 24 },
  { slug: "s-759", label: "Picture 759", w: 23, h: 24 },
  { slug: "s-761", label: "Picture 761", w: 23, h: 24 },
  { slug: "s-762", label: "Picture 762", w: 23, h: 24 },
  { slug: "s-763", label: "Picture 763", w: 23, h: 24 },
  { slug: "s-764", label: "Picture 764", w: 23, h: 24 },
  { slug: "s-765", label: "Picture 765", w: 23, h: 24 },
  { slug: "s-766", label: "Picture 766", w: 23, h: 24 },
  { slug: "s-767", label: "Picture 767", w: 23, h: 24 },
  { slug: "s-768", label: "Picture 768", w: 23, h: 24 },
  { slug: "s-770", label: "Picture 770", w: 23, h: 24 },
  { slug: "s-771", label: "Picture 771", w: 23, h: 24 },
  { slug: "s-772", label: "Picture 772", w: 23, h: 24 },
  { slug: "s-773", label: "Picture 773", w: 23, h: 24 },
  { slug: "s-774", label: "Picture 774", w: 23, h: 24 },
  { slug: "s-775", label: "Picture 775", w: 23, h: 24 },
  { slug: "s-776", label: "Picture 776", w: 23, h: 24 },
  { slug: "s-777", label: "Picture 777", w: 23, h: 24 },
  { slug: "s-779", label: "Picture 779", w: 23, h: 24 },
  { slug: "s-780", label: "Picture 780", w: 23, h: 24 },
  { slug: "s-781", label: "Picture 781", w: 23, h: 24 },
  { slug: "s-782", label: "Picture 782", w: 23, h: 24 },
  { slug: "s-783", label: "Picture 783", w: 23, h: 23 },
  { slug: "s-784", label: "Picture 784", w: 23, h: 23 },
  { slug: "s-785", label: "Picture 785", w: 23, h: 23 },
  { slug: "s-786", label: "Picture 786", w: 24, h: 23 },
  { slug: "s-787", label: "Picture 787", w: 23, h: 23 },
  { slug: "s-788", label: "Picture 788", w: 17, h: 20 },
  { slug: "s-789", label: "Picture 789", w: 20, h: 20 },
  { slug: "s-790", label: "Picture 790", w: 14, h: 20 },
  { slug: "s-791", label: "Picture 791", w: 18, h: 20 },
  { slug: "s-792", label: "Picture 792", w: 20, h: 21 },
  { slug: "s-793", label: "Picture 793", w: 19, h: 17 },
  { slug: "s-794", label: "Picture 794", w: 20, h: 15 },
  { slug: "s-795", label: "Picture 795", w: 13, h: 21 },
  { slug: "s-796", label: "Picture 796", w: 17, h: 20 },
  { slug: "s-797", label: "Picture 797", w: 18, h: 20 },
  { slug: "s-798", label: "Picture 798", w: 20, h: 20 },
  { slug: "s-799", label: "Picture 799", w: 17, h: 18 },
  { slug: "s-800", label: "Picture 800", w: 19, h: 16 },
  { slug: "s-801", label: "Picture 801", w: 21, h: 21 },
  { slug: "s-802", label: "Picture 802", w: 20, h: 21 },
  { slug: "s-803", label: "Picture 803", w: 19, h: 19 },
  { slug: "s-804", label: "Picture 804", w: 20, h: 19 },
  { slug: "s-805", label: "Picture 805", w: 19, h: 19 },
  { slug: "s-806", label: "Picture 806", w: 19, h: 18 },
  { slug: "s-807", label: "Picture 807", w: 17, h: 20 },
  { slug: "s-808", label: "Picture 808", w: 20, h: 20 },
  { slug: "s-809", label: "Picture 809", w: 20, h: 20 },
  { slug: "s-810", label: "Picture 810", w: 15, h: 20 },
  { slug: "s-811", label: "Picture 811", w: 14, h: 20 },
  { slug: "s-812", label: "Picture 812", w: 20, h: 20 },
  { slug: "s-813", label: "Picture 813", w: 14, h: 20 },
  { slug: "s-814", label: "Picture 814", w: 19, h: 20 },
  { slug: "s-815", label: "Picture 815", w: 21, h: 19 },
  { slug: "s-816", label: "Picture 816", w: 18, h: 17 },
  { slug: "s-850", label: "Picture 850", w: 21, h: 21 },
  { slug: "s-851", label: "Picture 851", w: 21, h: 21 },
  { slug: "s-852", label: "Picture 852", w: 21, h: 21 },
  { slug: "s-853", label: "Picture 853", w: 21, h: 21 },
  { slug: "s-854", label: "Picture 854", w: 22, h: 21 },
  { slug: "s-855", label: "Picture 855", w: 22, h: 21 },
  { slug: "s-856", label: "Picture 856", w: 21, h: 21 },
  { slug: "s-857", label: "Picture 857", w: 21, h: 21 },
  { slug: "s-858", label: "Picture 858", w: 21, h: 21 },
  { slug: "s-859", label: "Picture 859", w: 21, h: 21 },
  { slug: "s-860", label: "Picture 860", w: 21, h: 21 },
  { slug: "s-861", label: "Picture 861", w: 21, h: 21 },
  { slug: "s-862", label: "Picture 862", w: 21, h: 21 },
  { slug: "s-863", label: "Picture 863", w: 21, h: 21 },
  { slug: "s-864", label: "Picture 864", w: 22, h: 21 },
  { slug: "s-865", label: "Picture 865", w: 21, h: 21 },
  { slug: "s-866", label: "Picture 866", w: 21, h: 21 },
  { slug: "s-867", label: "Picture 867", w: 21, h: 21 },
  { slug: "s-868", label: "Picture 868", w: 21, h: 21 },
  { slug: "s-869", label: "Picture 869", w: 22, h: 21 },
  { slug: "s-870", label: "Picture 870", w: 21, h: 21 },
  { slug: "s-871", label: "Picture 871", w: 21, h: 21 },
  { slug: "s-872", label: "Picture 872", w: 21, h: 21 },
  { slug: "s-873", label: "Picture 873", w: 21, h: 21 },
  { slug: "s-874", label: "Picture 874", w: 21, h: 21 },
  { slug: "s-875", label: "Picture 875", w: 21, h: 21 },
  { slug: "s-876", label: "Picture 876", w: 21, h: 21 },
  { slug: "s-877", label: "Picture 877", w: 21, h: 21 },
  { slug: "s-878", label: "Picture 878", w: 22, h: 21 },
  { slug: "s-879", label: "Picture 879", w: 21, h: 21 },
  { slug: "s-880", label: "Picture 880", w: 21, h: 21 },
  { slug: "s-881", label: "Picture 881", w: 21, h: 21 },
  { slug: "s-882", label: "Picture 882", w: 21, h: 21 },
  { slug: "s-883", label: "Picture 883", w: 21, h: 21 },
  { slug: "s-884", label: "Picture 884", w: 21, h: 21 },
  { slug: "s-885", label: "Picture 885", w: 21, h: 21 },
  { slug: "s-886", label: "Picture 886", w: 21, h: 21 },
  { slug: "s-887", label: "Picture 887", w: 21, h: 21 },
  { slug: "s-888", label: "Picture 888", w: 21, h: 21 },
  { slug: "s-889", label: "Picture 889", w: 21, h: 21 },
  { slug: "s-890", label: "Picture 890", w: 21, h: 21 },
  { slug: "s-891", label: "Picture 891", w: 21, h: 21 },
  { slug: "s-892", label: "Picture 892", w: 21, h: 21 },
  { slug: "s-893", label: "Picture 893", w: 18, h: 18 },
  { slug: "s-894", label: "Picture 894", w: 17, h: 18 },
  { slug: "s-895", label: "Picture 895", w: 8, h: 19 },
  { slug: "s-896", label: "Picture 896", w: 17, h: 18 },
  { slug: "s-897", label: "Picture 897", w: 17, h: 18 },
  { slug: "s-898", label: "Picture 898", w: 16, h: 17 },
  { slug: "s-899", label: "Picture 899", w: 17, h: 17 },
  { slug: "s-900", label: "Picture 900", w: 17, h: 17 },
  { slug: "s-901", label: "Picture 901", w: 17, h: 18 },
  { slug: "s-902", label: "Picture 902", w: 17, h: 16 },
  { slug: "s-903", label: "Picture 903", w: 17, h: 16 },
  { slug: "s-904", label: "Picture 904", w: 17, h: 17 },
  { slug: "s-905", label: "Picture 905", w: 17, h: 18 },
  { slug: "s-906", label: "Picture 906", w: 17, h: 18 },
  { slug: "s-907", label: "Picture 907", w: 17, h: 18 },
  { slug: "s-908", label: "Picture 908", w: 17, h: 18 },
  { slug: "s-909", label: "Picture 909", w: 17, h: 18 },
  { slug: "s-910", label: "Picture 910", w: 17, h: 18 },
  { slug: "s-911", label: "Picture 911", w: 17, h: 18 },
  { slug: "s-912", label: "Picture 912", w: 18, h: 18 },
  { slug: "s-913", label: "Picture 913", w: 17, h: 18 },
  { slug: "s-914", label: "Picture 914", w: 17, h: 18 },
  { slug: "s-915", label: "Picture 915", w: 17, h: 18 },
  { slug: "s-916", label: "Picture 916", w: 17, h: 17 },
  { slug: "s-917", label: "Picture 917", w: 17, h: 19 },
  { slug: "s-918", label: "Picture 918", w: 17, h: 19 },
  { slug: "s-919", label: "Picture 919", w: 18, h: 18 },
  { slug: "s-920", label: "Picture 920", w: 18, h: 19 },
  { slug: "s-921", label: "Picture 921", w: 17, h: 19 },
  { slug: "s-922", label: "Picture 922", w: 17, h: 17 },
  { slug: "s-923", label: "Picture 923", w: 17, h: 17 },
  { slug: "s-924", label: "Picture 924", w: 17, h: 17 },
  { slug: "s-925", label: "Picture 925", w: 18, h: 17 },
  { slug: "s-926", label: "Picture 926", w: 17, h: 19 },
  { slug: "s-927", label: "Picture 927", w: 17, h: 19 },
  { slug: "s-928", label: "Picture 928", w: 18, h: 18 },
  { slug: "s-929", label: "Picture 929", w: 18, h: 18 },
  { slug: "s-930", label: "Picture 930", w: 17, h: 19 },
  { slug: "s-931", label: "Picture 931", w: 18, h: 19 },
  { slug: "s-932", label: "Picture 932", w: 12, h: 19 },
  { slug: "s-933", label: "Picture 933", w: 17, h: 19 },
  { slug: "s-934", label: "Picture 934", w: 17, h: 19 },
  { slug: "s-935", label: "Picture 935", w: 15, h: 18 },
  { slug: "s-936", label: "Picture 936", w: 17, h: 17 },
  { slug: "s-937", label: "Picture 937", w: 16, h: 20 },
  { slug: "s-938", label: "Picture 938", w: 18, h: 18 },
  { slug: "s-939", label: "Picture 939", w: 15, h: 18 },
  { slug: "s-940", label: "Picture 940", w: 17, h: 18 },
  { slug: "s-941", label: "Picture 941", w: 15, h: 18 },
  { slug: "s-942", label: "Picture 942", w: 17, h: 18 },
  { slug: "s-943", label: "Picture 943", w: 16, h: 18 },
  { slug: "s-944", label: "Picture 944", w: 16, h: 18 },
  { slug: "s-945", label: "Picture 945", w: 17, h: 18 },
  { slug: "s-946", label: "Picture 946", w: 17, h: 18 },
  { slug: "s-947", label: "Picture 947", w: 17, h: 17 },
  { slug: "s-948", label: "Picture 948", w: 18, h: 17 },
  { slug: "s-949", label: "Picture 949", w: 17, h: 17 },
  { slug: "s-950", label: "Picture 950", w: 18, h: 16 },
  { slug: "s-951", label: "Picture 951", w: 18, h: 17 },
  { slug: "s-952", label: "Picture 952", w: 13, h: 17 },
  { slug: "s-953", label: "Picture 953", w: 16, h: 17 },
  { slug: "s-954", label: "Picture 954", w: 14, h: 17 },
  { slug: "s-955", label: "Picture 955", w: 16, h: 17 },
  { slug: "s-956", label: "Picture 956", w: 15, h: 17 },
  { slug: "s-957", label: "Picture 957", w: 14, h: 17 },
  { slug: "s-958", label: "Picture 958", w: 17, h: 17 },
  { slug: "s-959", label: "Picture 959", w: 11, h: 16 },
  { slug: "s-960", label: "Picture 960", w: 11, h: 16 },
  { slug: "s-961", label: "Picture 961", w: 18, h: 9 },
  { slug: "s-962", label: "Picture 962", w: 11, h: 16 },
  { slug: "s-963", label: "Picture 963", w: 18, h: 16 },
  { slug: "s-964", label: "Picture 964", w: 12, h: 16 },
  { slug: "s-965", label: "Picture 965", w: 12, h: 16 },
  { slug: "s-966", label: "Picture 966", w: 16, h: 16 },
  { slug: "s-967", label: "Picture 967", w: 12, h: 16 },
  { slug: "s-968", label: "Picture 968", w: 10, h: 16 },
  { slug: "s-969", label: "Picture 969", w: 17, h: 16 },
  { slug: "s-970", label: "Picture 970", w: 17, h: 16 },
  { slug: "s-971", label: "Picture 971", w: 18, h: 16 },
  { slug: "s-972", label: "Picture 972", w: 19, h: 16 },
  { slug: "s-973", label: "Picture 973", w: 18, h: 17 },
  { slug: "s-974", label: "Picture 974", w: 17, h: 16 },
  { slug: "s-975", label: "Picture 975", w: 18, h: 14 },
  { slug: "s-976", label: "Picture 976", w: 18, h: 15 },
  { slug: "s-977", label: "Picture 977", w: 13, h: 15 },
  { slug: "s-978", label: "Picture 978", w: 15, h: 16 },
  { slug: "s-979", label: "Picture 979", w: 15, h: 16 },
  { slug: "s-980", label: "Picture 980", w: 18, h: 16 },
  { slug: "s-981", label: "Picture 981", w: 16, h: 16 },
  { slug: "s-982", label: "Picture 982", w: 16, h: 21 },
  { slug: "s-983", label: "Picture 983", w: 20, h: 20 },
  { slug: "s-984", label: "Picture 984", w: 16, h: 21 },
  { slug: "s-985", label: "Picture 985", w: 20, h: 19 },
  { slug: "s-986", label: "Picture 986", w: 19, h: 19 },
  { slug: "s-987", label: "Picture 987", w: 15, h: 22 },
  { slug: "s-988", label: "Picture 988", w: 21, h: 17 },
  { slug: "s-989", label: "Picture 989", w: 18, h: 13 },
  { slug: "s-990", label: "Picture 990", w: 21, h: 15 },
  { slug: "s-991", label: "Picture 991", w: 18, h: 20 },
  { slug: "s-992", label: "Picture 992", w: 20, h: 20 },
  { slug: "s-993", label: "Picture 993", w: 20, h: 20 },
  { slug: "s-994", label: "Picture 994", w: 21, h: 20 },
  { slug: "s-995", label: "Picture 995", w: 17, h: 20 },
  { slug: "s-996", label: "Picture 996", w: 20, h: 20 },
  { slug: "s-997", label: "Picture 997", w: 22, h: 14 },
  { slug: "s-998", label: "Picture 998", w: 14, h: 21 },
  { slug: "s-999", label: "Picture 999", w: 21, h: 21 },
  { slug: "s-1000", label: "Picture 1000", w: 17, h: 21 },
  { slug: "s-1001", label: "Picture 1001", w: 15, h: 21 },
  { slug: "s-1002", label: "Picture 1002", w: 20, h: 19 },
  { slug: "s-1003", label: "Picture 1003", w: 20, h: 19 },
  { slug: "s-1004", label: "Picture 1004", w: 19, h: 18 },
  { slug: "s-1005", label: "Picture 1005", w: 21, h: 20 },
  { slug: "s-1006", label: "Picture 1006", w: 21, h: 21 },
  { slug: "s-1007", label: "Picture 1007", w: 20, h: 20 },
  { slug: "s-1008", label: "Picture 1008", w: 21, h: 21 },
  { slug: "s-1009", label: "Picture 1009", w: 21, h: 20 },
  { slug: "s-1010", label: "Picture 1010", w: 18, h: 19 },
  { slug: "s-1011", label: "Picture 1011", w: 17, h: 19 },
  { slug: "s-1012", label: "Picture 1012", w: 21, h: 19 },
  { slug: "s-1013", label: "Picture 1013", w: 21, h: 19 },
  { slug: "s-1014", label: "Picture 1014", w: 21, h: 7 },
  { slug: "s-1015", label: "Picture 1015", w: 23, h: 23 },
  { slug: "s-4", label: "Picture 4", w: 48, h: 23 },
  { slug: "s-13", label: "Picture 13", w: 48, h: 24 },
  { slug: "s-22", label: "Picture 22", w: 48, h: 24 },
  { slug: "s-31", label: "Picture 31", w: 48, h: 24 },
  { slug: "s-50", label: "Picture 50", w: 48, h: 23 },
  { slug: "s-59", label: "Picture 59", w: 48, h: 24 },
  { slug: "s-68", label: "Picture 68", w: 48, h: 24 },
  { slug: "s-77", label: "Picture 77", w: 48, h: 24 },
  { slug: "s-751", label: "Picture 751", w: 48, h: 23 },
  { slug: "s-760", label: "Picture 760", w: 48, h: 24 },
  { slug: "s-769", label: "Picture 769", w: 48, h: 24 },
  { slug: "s-778", label: "Picture 778", w: 48, h: 24 },
  { slug: "s-849", label: "Picture 849", w: 25, h: 38 },
  { slug: "e-1", label: "Emoji 1", w: 10, h: 14 },
  { slug: "e-2", label: "Emoji 2", w: 11, h: 13 },
  { slug: "e-3", label: "Emoji 3", w: 13, h: 11 },
  { slug: "e-4", label: "Emoji 4", w: 13, h: 12 },
  { slug: "e-5", label: "Emoji 5", w: 11, h: 11 },
  { slug: "e-6", label: "Emoji 6", w: 13, h: 14 },
  { slug: "e-7", label: "Emoji 7", w: 11, h: 12 },
  { slug: "e-8", label: "Emoji 8", w: 13, h: 13 },
  { slug: "e-9", label: "Emoji 9", w: 13, h: 14 },
  { slug: "e-10", label: "Emoji 10", w: 11, h: 12 },
  { slug: "e-11", label: "Emoji 11", w: 11, h: 12 },
  { slug: "e-12", label: "Emoji 12", w: 13, h: 12 },
  { slug: "e-13", label: "Emoji 13", w: 11, h: 12 },
  { slug: "e-14", label: "Emoji 14", w: 11, h: 12 },
  { slug: "e-15", label: "Emoji 15", w: 11, h: 12 },
  { slug: "e-16", label: "Emoji 16", w: 12, h: 14 },
  { slug: "e-17", label: "Emoji 17", w: 11, h: 12 },
  { slug: "e-18", label: "Emoji 18", w: 11, h: 12 },
  { slug: "e-19", label: "Emoji 19", w: 11, h: 12 },
  { slug: "e-20", label: "Emoji 20", w: 12, h: 12 },
  { slug: "e-21", label: "Emoji 21", w: 11, h: 12 },
  { slug: "e-22", label: "Emoji 22", w: 11, h: 12 },
  { slug: "e-23", label: "Emoji 23", w: 13, h: 12 },
  { slug: "e-24", label: "Emoji 24", w: 11, h: 13 },
  { slug: "e-25", label: "Emoji 25", w: 11, h: 12 },
  { slug: "e-26", label: "Emoji 26", w: 11, h: 12 },
  { slug: "e-27", label: "Emoji 27", w: 11, h: 12 },
  { slug: "e-28", label: "Emoji 28", w: 11, h: 12 },
  { slug: "e-29", label: "Emoji 29", w: 11, h: 12 },
  { slug: "e-30", label: "Emoji 30", w: 11, h: 12 },
  { slug: "e-31", label: "Emoji 31", w: 11, h: 12 },
  { slug: "e-32", label: "Emoji 32", w: 11, h: 12 },
  { slug: "e-33", label: "Emoji 33", w: 12, h: 12 },
  { slug: "e-34", label: "Emoji 34", w: 11, h: 12 },
  { slug: "e-35", label: "Emoji 35", w: 11, h: 12 },
  { slug: "e-36", label: "Emoji 36", w: 11, h: 12 },
  { slug: "e-37", label: "Emoji 37", w: 13, h: 12 },
  { slug: "e-38", label: "Emoji 38", w: 12, h: 13 },
  { slug: "e-39", label: "Emoji 39", w: 11, h: 12 },
  { slug: "e-40", label: "Emoji 40", w: 11, h: 12 },
  { slug: "e-41", label: "Emoji 41", w: 11, h: 12 },
  { slug: "e-42", label: "Emoji 42", w: 11, h: 12 },
  { slug: "e-43", label: "Emoji 43", w: 11, h: 12 },
  { slug: "e-44", label: "Emoji 44", w: 11, h: 14 },
  { slug: "e-45", label: "Emoji 45", w: 11, h: 13 },
  { slug: "e-46", label: "Emoji 46", w: 13, h: 13 },
  { slug: "e-47", label: "Emoji 47", w: 11, h: 12 },
  { slug: "e-48", label: "Emoji 48", w: 11, h: 12 },
  { slug: "e-49", label: "Emoji 49", w: 12, h: 12 },
  { slug: "e-50", label: "Emoji 50", w: 11, h: 12 },
  { slug: "e-51", label: "Emoji 51", w: 11, h: 12 },
  { slug: "e-52", label: "Emoji 52", w: 11, h: 12 },
  { slug: "e-53", label: "Emoji 53", w: 11, h: 12 },
  { slug: "e-54", label: "Emoji 54", w: 11, h: 12 },
  { slug: "e-55", label: "Emoji 55", w: 11, h: 12 },
  { slug: "e-56", label: "Emoji 56", w: 11, h: 12 },
  { slug: "e-57", label: "Emoji 57", w: 13, h: 12 },
  { slug: "e-58", label: "Emoji 58", w: 11, h: 12 },
  { slug: "e-59", label: "Emoji 59", w: 11, h: 12 },
  { slug: "e-60", label: "Emoji 60", w: 11, h: 12 },
  { slug: "e-61", label: "Emoji 61", w: 11, h: 12 },
  { slug: "e-62", label: "Emoji 62", w: 11, h: 12 },
  { slug: "e-63", label: "Emoji 63", w: 11, h: 12 },
  { slug: "e-64", label: "Emoji 64", w: 13, h: 12 },
  { slug: "e-65", label: "Emoji 65", w: 11, h: 12 },
  { slug: "e-66", label: "Emoji 66", w: 11, h: 12 },
  { slug: "e-67", label: "Emoji 67", w: 11, h: 12 },
  { slug: "e-68", label: "Emoji 68", w: 11, h: 12 },
  { slug: "e-69", label: "Emoji 69", w: 11, h: 12 },
  { slug: "e-70", label: "Emoji 70", w: 11, h: 12 },
] as const;
export type ItemSlug = (typeof ITEMS)[number]["slug"];

/** Where an icon's picture lives: `e-<n>` a Pixelmeadow emoji face, `t-<name>` is a tradable badge, `s-<n>` a picture from the badge set, the rest plain icons. */
export const itemSrc = (slug: string): string =>
  slug.startsWith("e-")
    ? `/emoji/pm-${slug.slice(2)}-s.png`
    : slug.startsWith("t-")
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
