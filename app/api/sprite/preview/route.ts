import { NextResponse } from "next/server";
import { PNG } from "pngjs";
import { createClient } from "@/lib/supabase/server";
import { composePortrait } from "@/lib/portrait/compose.server";
import { defaultPortrait, normalizePortrait, type PortraitConfig } from "@/lib/portrait/core";
import { OPTIONS, SIDES_OWN } from "@/lib/portrait/manifest";
import { portraitOverrides } from "@/lib/sprites.server";

export const runtime = "nodejs";

/** Which control, set to which option, draws this cell (Sheet/id). */
function controlFor(cell: string): { key: string; id: string } | null {
  for (const [key, options] of Object.entries(OPTIONS)) for (const o of options) if (o.cells.includes(cell)) return { key, id: o.id };
  return null;
}

/** A face with a cell as it is being drawn, not yet saved: {cell: "HairSides/28", png (base64), skin, hair}.
 *  The rest of the face is a plain default, with the control that draws this cell set to it. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not yours", { status: 403 });
  const { data: me } = await supabase.from("profiles").select("is_witch").eq("id", user.id).maybeSingle();
  if (!me?.is_witch) return new NextResponse("Not yours", { status: 403 });

  const body = (await request.json().catch(() => null)) as { cell?: string; png?: string; skin?: string; hair?: string; face?: unknown } | null;
  const cell = body?.cell ?? "";
  if (!/^[A-Za-z]+\/[A-Za-z0-9-]+$/.test(cell) || !body?.png) return new NextResponse("Bad", { status: 400 });
  let px: Uint8ClampedArray;
  try {
    const png = PNG.sync.read(Buffer.from(body.png, "base64"));
    if (png.width !== 128 || png.height !== 128) return new NextResponse("Size", { status: 400 });
    px = new Uint8ClampedArray(png.data);
  } catch {
    return new NextResponse("Not a PNG", { status: 400 });
  }

  const raw: Record<string, unknown> = { ...(body.face && typeof body.face === "object" ? (body.face as Record<string, unknown>) : defaultPortrait()) };
  const ctl = controlFor(cell);
  if (ctl) {
    raw[ctl.key] = ctl.id;
    if (ctl.key === "hair_back") raw.top = SIDES_OWN[ctl.id] ?? ctl.id;
    if (ctl.key === "top") raw.hair_back = ctl.id;
  }
  if (body.skin) raw.skin = body.skin;
  if (body.hair) raw.hair_colour = body.hair;
  const config: PortraitConfig = normalizePortrait(raw);

  const overrides = await portraitOverrides();
  overrides.set(`${cell}.png`, px);
  return new NextResponse(new Uint8Array(composePortrait(config, { overrides })), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
