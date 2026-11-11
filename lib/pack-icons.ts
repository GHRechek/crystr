/** The "1000 Pixel Art Icons" pack, as public/badges/pack/<category>-<n>.png (16px, outline darkened to #0b0510), for the
 *  badge maker's picture picker. Each category's pictures are numbered 1 to its count. Keep in step with
 *  scripts/pack-icons.py, which copies them in. */
export const PACK_CATEGORIES: { slug: string; label: string; count: number }[] = [
  { slug: "nature", label: "NATURE", count: 145 },
  { slug: "animals", label: "ANIMALS", count: 103 },
  { slug: "characters", label: "CHARACTERS", count: 49 },
  { slug: "food", label: "FOOD", count: 219 },
  { slug: "objects", label: "OBJECTS", count: 538 },
  { slug: "people", label: "PEOPLE", count: 327 },
  { slug: "symbols", label: "SYMBOLS", count: 257 },
  { slug: "travel", label: "TRAVEL", count: 163 },
  { slug: "weapons", label: "WEAPONS", count: 81 },
  { slug: "activity", label: "ACTIVITY", count: 123 },
];
export const PACK_RE = /^(nature|animals|characters|food|objects|people|symbols|travel|weapons|activity)-([0-9]{1,3})$/;
/** True for a pack picture key like "nature-31" that exists. */
export const isPackPicture = (key: string) => { const m = PACK_RE.exec(key); return !!m && Number(m[2]) >= 1 && Number(m[2]) <= (PACK_CATEGORIES.find((c) => c.slug === m[1])?.count ?? 0); };
