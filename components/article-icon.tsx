import { pictureFor } from "@/lib/article-icons";

/** The picture picked for an article, drawn at a whole number of times its size so the pixels
 *  stay square, as large as fits in `box` pixels. */
export function ArticleIcon({ slug, box = 88 }: { slug: string | null | undefined; box?: number }) {
  const it = pictureFor(slug);
  if (!it) return null;
  const k = Math.max(1, Math.floor(box / Math.max(it.w, it.h)));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={it.src} alt="" width={it.w * k} height={it.h * k} style={{ display: "block", imageRendering: "pixelated" }} />
  );
}
