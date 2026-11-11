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

// ------------------------------------------------------------------ edits made by the app itself

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ELEMENT_COLOR, type Element } from "@/lib/historikals";

/** Save a PNG over a shipped sprite, as the witch would from the editor: into the bucket, and onto the list. */
export async function saveSpriteOverride(supabase: SupabaseClient, path: string, png: Buffer, by: string): Promise<string | null> {
  const up = await supabase.storage.from("sprites").upload(path, png, { upsert: true, contentType: "image/png", cacheControl: "60" });
  if (up.error) return up.error.message;
  const row = await supabase.from("sprite_overrides").upsert({ path, updated_at: new Date().toISOString(), updated_by: by });
  return row.error ? row.error.message : null;
}

/** The sprite as it stands: the edit if there is one, else the shipped file. */
async function currentSprite(supabase: SupabaseClient, path: string): Promise<PNG | null> {
  try {
    const { data: over } = await supabase.from("sprite_overrides").select("updated_at").eq("path", path).maybeSingle();
    if (over) {
      const r = await fetch(`${SPRITE_BUCKET_URL}${path}?v=${Date.parse(over.updated_at) || 0}`, { cache: "no-store" });
      if (r.ok) return PNG.sync.read(Buffer.from(await r.arrayBuffer()));
    }
    return PNG.sync.read(readFileSync(join(process.cwd(), "public", path)));
  } catch {
    return null;
  }
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, max ? d / max : 0, max];
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const hueOf = (hex: string) => rgbToHsv(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))[0];

/** Whether a pixel wears the type's colour. Ward is grey and Spirit pale, so they go by want of colour rather than hue. */
function wears(type: Element, h: number, s: number, v: number): boolean {
  if (v < 0.08) return false;
  if (type === "ward") return s < 0.2 && v >= 0.25;
  if (type === "spirit") return s < 0.4 && v >= 0.6;
  if (s < 0.15) return false;
  const d = Math.abs(h - hueOf(ELEMENT_COLOR[type]));
  return Math.min(d, 360 - d) <= (type === "feral" ? 18 : 32);
}
/** The same pixel in the new type's colour, keeping its depth. */
function dress(type: Element, h: number, s: number, v: number): [number, number, number] {
  if (type === "ward") return hsvToRgb(220, Math.min(s, 0.08), v);
  // Spirit is pale: a light cream, keeping only a little of the pixel's depth so the drawing still reads.
  if (type === "spirit") return hsvToRgb(48, Math.min(Math.max(s * 0.6, 0.12), 0.3), Math.min(0.97, 0.62 + v * 0.35));
  // Its hue, with the colour no stronger than the type's own swatch allows: a fire orange made green
  // would otherwise glow neon.
  const [th, ts] = rgbToHsv(parseInt(ELEMENT_COLOR[type].slice(1, 3), 16), parseInt(ELEMENT_COLOR[type].slice(3, 5), 16), parseInt(ELEMENT_COLOR[type].slice(5, 7), 16));
  return hsvToRgb(th, Math.min(Math.max(s, 0.25), Math.max(0.45, ts + 0.15)), v);
}

/** Every pixel that wears the old type's colour takes the new one, at its own depth. When the picture does not
 *  really wear that colour (a spirit creature drawn in purple, say), the sprite's dominant hue family is what
 *  changes instead: the costume, whatever colour the artist gave it. */
export function redress(png: PNG, from: Element, to: Element): number {
  const d = png.data;
  const px: [number, number, number, number][] = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) px.push([i, ...rgbToHsv(d[i], d[i + 1], d[i + 2])]);
  const wearing = px.filter(([, h, s, v]) => wears(from, h, s, v));
  let chosen = wearing;
  // Spirit and ward are "colourless" types, and pale or grey pixels are more often skin and highlights than
  // the type's colour: for those, go by the dominant hue whenever the sprite has one.
  if (from === "spirit" || from === "ward" || wearing.length < Math.max(12, px.length * 0.08)) {
    // Dominant hue: the fullest of twelve hue bins among coloured pixels, with its neighbours.
    // Skin and hat leather (peach and tan) are not a costume: they sit out the vote, unless nothing else is coloured.
    const skinLike = (h: number, s: number, v: number) => h >= 12 && h <= 48 && s >= 0.18 && s <= 0.55 && v >= 0.45;
    const vote = (allowSkin: boolean) => {
      const bins = new Array(12).fill(0);
      for (const [, h, s, v] of px) if (s >= 0.25 && v >= 0.15 && (allowSkin || !skinLike(h, s, v))) bins[Math.floor(h / 30) % 12]++;
      return [bins.indexOf(Math.max(...bins)), Math.max(...bins), allowSkin] as const;
    };
    let [top, n, allowSkin] = vote(false);
    if (n < Math.max(8, px.length * 0.06)) [top, n, allowSkin] = vote(true);
    if (n < Math.max(8, px.length * 0.06)) { if (!wearing.length) return 0; } else {
      const near = (h: number) => { const b = Math.floor(h / 30) % 12; return b === top || b === (top + 1) % 12 || b === (top + 11) % 12; };
      chosen = px.filter(([, h, s, v]) => s >= 0.2 && v >= 0.12 && near(h) && (allowSkin || !skinLike(h, s, v)));
    }
  }
  for (const [i, h, s, v] of chosen) {
    const [r, g, b] = dress(to, h, s, v);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  return chosen.length;
}

/** The creature's pictures (both frames) re-dressed from one first type to another: every pixel that wore the
 *  old type's colour takes the new one, at its own depth. A rough cut, saved as an edit a witch can touch up
 *  or reset in the sprite editor. Creatures that roll their type have a picture per type already. */
export async function retintCreature(supabase: SupabaseClient, slug: string, from: Element, to: Element, by: string): Promise<string | null> {
  if (from === to) return null;
  for (const file of [`${slug}.png`, `${slug}-2.png`]) {
    const path = `creatures/${file}`;
    const png = await currentSprite(supabase, path);
    if (!png) continue;
    redress(png, from, to);
    const why = await saveSpriteOverride(supabase, path, PNG.sync.write(png), by);
    if (why) return why;
  }
  return null;
}
