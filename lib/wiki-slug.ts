// Page addresses. Pure, so client components can use it too.

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "The Low Market" -> "the-low-market". The page form suggests this. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
