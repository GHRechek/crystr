import { ITEMS } from "@/lib/token";

/** The icon picked as an article's picture, drawn at a whole number of times its size so the
 *  pixels stay square, as large as fits in `box` cells' worth of pixels (default 88). */
export function ArticleIcon({ slug, box = 88 }: { slug: string | null | undefined; box?: number }) {
  const it = ITEMS.find((i) => i.slug === slug);
  if (!it) return null;
  const k = Math.max(1, Math.floor(box / Math.max(it.w, it.h)));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/badges/items/${it.slug}.png`} alt="" width={it.w * k} height={it.h * k} style={{ display: "block", imageRendering: "pixelated" }} />
  );
}
