import { PNG } from "pngjs";
import { SPRITE_BUCKET_URL, type SpriteOverride } from "@/lib/sprites";

/** The override list, straight from the REST API with the anon key (the table is readable by anyone),
 *  so it can be cached by the fetch layer for a short while on every page. */
export async function getSpriteOverrides(): Promise<SpriteOverride[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/sprite_overrides?select=path,updated_at`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 15 },
    });
    if (!r.ok) return [];
    return (await r.json()) as SpriteOverride[];
  } catch {
    return [];
  }
}

const decoded = new Map<string, Uint8ClampedArray | null>();

/** The edited PNG's pixels (128x128 for a portrait cell), decoded once per version. */
export async function fetchOverrideCell(path: string, updatedAt: string, size: number): Promise<Uint8ClampedArray | null> {
  const key = `${path}@${updatedAt}`;
  const hit = decoded.get(key);
  if (hit !== undefined) return hit;
  let out: Uint8ClampedArray | null = null;
  try {
    const r = await fetch(`${SPRITE_BUCKET_URL}${path}?v=${Date.parse(updatedAt) || 0}`, { cache: "force-cache" });
    if (r.ok) {
      const png = PNG.sync.read(Buffer.from(await r.arrayBuffer()));
      if (png.width === size && png.height === size) out = new Uint8ClampedArray(png.data);
    }
  } catch {
    out = null;
  }
  decoded.set(key, out);
  return out;
}

/** Every overridden portrait cell, decoded, keyed as the compositor names cells (Sheet/id.png). */
export async function portraitOverrides(): Promise<Map<string, Uint8ClampedArray>> {
  const list = await getSpriteOverrides();
  const out = new Map<string, Uint8ClampedArray>();
  await Promise.all(
    list
      .filter((o) => o.path.startsWith("portrait/"))
      .map(async (o) => {
        const px = await fetchOverrideCell(o.path, o.updated_at, 128);
        if (px) out.set(o.path.slice("portrait/".length), px);
      }),
  );
  return out;
}
