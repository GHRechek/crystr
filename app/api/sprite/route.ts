import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PNG } from "pngjs";
import { createClient } from "@/lib/supabase/server";
import { SPRITE_BUCKET_URL } from "@/lib/sprites";

export const runtime = "nodejs";

/** A sprite path the editor may touch: a portrait cell, or a Historikal picture. */
const PATH = /^(portrait\/[A-Za-z]+\/[A-Za-z0-9-]+|creatures\/[a-z0-9]+(?:-[a-z0-9]+)*)\.png$/;

async function witch() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("is_witch").eq("id", user.id).maybeSingle();
  return data?.is_witch ? { supabase, id: user.id } : null;
}

/** The sprite as it stands: the witch's edit if there is one, else the file the app shipped with. */
export async function GET(request: Request) {
  const me = await witch();
  if (!me) return new NextResponse("Not yours", { status: 403 });
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!PATH.test(path)) return new NextResponse("No such sprite", { status: 404 });
  const { data: over } = await me.supabase.from("sprite_overrides").select("updated_at").eq("path", path).maybeSingle();
  if (over) {
    const r = await fetch(`${SPRITE_BUCKET_URL}${path}?v=${Date.parse(over.updated_at) || 0}`, { cache: "no-store" });
    if (r.ok) return new NextResponse(await r.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Sprite-Edited": "1" } });
  }
  try {
    const file = path.startsWith("portrait/") ? join(process.cwd(), "assets", path) : join(process.cwd(), "public", path);
    return new NextResponse(new Uint8Array(readFileSync(file)), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch {
    return new NextResponse("No such sprite", { status: 404 });
  }
}

/** Save an edit: {path, png} with the PNG base64. A portrait cell must be 128x128; a creature keeps its size. */
export async function POST(request: Request) {
  const me = await witch();
  if (!me) return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { path?: string; png?: string } | null;
  const path = body?.path ?? "";
  if (!PATH.test(path) || !body?.png) return NextResponse.json({ ok: false, code: "bad" }, { status: 400 });
  const buf = Buffer.from(body.png, "base64");
  let png: PNG;
  try {
    png = PNG.sync.read(buf);
  } catch {
    return NextResponse.json({ ok: false, code: "not_png" }, { status: 400 });
  }
  if (path.startsWith("portrait/") && (png.width !== 128 || png.height !== 128)) return NextResponse.json({ ok: false, code: "size" }, { status: 400 });
  if (png.width > 256 || png.height > 256) return NextResponse.json({ ok: false, code: "size" }, { status: 400 });

  const up = await me.supabase.storage.from("sprites").upload(path, buf, { upsert: true, contentType: "image/png", cacheControl: "60" });
  if (up.error) return NextResponse.json({ ok: false, code: "storage", message: up.error.message }, { status: 500 });
  const updated_at = new Date().toISOString();
  const row = await me.supabase.from("sprite_overrides").upsert({ path, updated_at, updated_by: me.id });
  if (row.error) return NextResponse.json({ ok: false, code: "list", message: row.error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, updated_at });
}

/** Take an edit back: the shipped file stands again. */
export async function DELETE(request: Request) {
  const me = await witch();
  if (!me) return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  const path = body?.path ?? "";
  if (!PATH.test(path)) return NextResponse.json({ ok: false, code: "bad" }, { status: 400 });
  await me.supabase.storage.from("sprites").remove([path]);
  await me.supabase.from("sprite_overrides").delete().eq("path", path);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
