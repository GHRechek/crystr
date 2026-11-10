/** Sprites a witch has edited in the app (see /witch/sprites). Each is a PNG in the public `sprites`
 *  bucket, at the path the shipped file would have had: portrait/<Sheet>/<id>.png or creatures/<file>.png.
 *  The list of what is overridden is loaded once per page by the app layout and kept here, so a picture
 *  helper anywhere (server or client) can swap in the edited file without asking the database. */
export type SpriteOverride = { path: string; updated_at: string };

let LIST = new Map<string, number>();
let VERSION = 0;

export function setSpriteOverrides(list: SpriteOverride[]) {
  LIST = new Map(list.map((o) => [o.path, Date.parse(o.updated_at) || 0]));
  VERSION = Math.max(0, ...LIST.values());
}

/** Where the bucket serves from. */
export const SPRITE_BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/sprites/`;

/** The edited file for this path, with a cache-buster, or null when the shipped one stands. */
export function spriteUrl(path: string): string | null {
  const ts = LIST.get(path);
  return ts ? `${SPRITE_BUCKET_URL}${path}?v=${ts}` : null;
}

export function spriteOverridden(path: string): boolean {
  return LIST.has(path);
}

/** When the newest edit landed: faces are cached by URL forever, so this goes on the URL. */
export function spriteVersion(): number {
  return VERSION;
}
