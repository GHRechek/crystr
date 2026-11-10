import { NextResponse } from "next/server";
import { composePortrait } from "@/lib/portrait/compose.server";
import { unpackPortrait } from "@/lib/portrait/core";
import { portraitOverrides } from "@/lib/sprites.server";

export const runtime = "nodejs";

// /face/<packed>.png — the whole portrait is described by the URL, so this is
// content-addressed: a changed face is a changed URL, and the composed PNG can
// be cached forever. No lookup, no auth, nothing identifying in the path.
// ?bare=1 draws just the head, with no background. ?v=<n> is the sprite-edit version, so a cell a witch
// edits in the app makes a new URL (the edit itself comes from lib/sprites.server).
export async function GET(request: Request, props: { params: Promise<{ spec: string }> }) {
  const params = await props.params;
  const config = unpackPortrait(params.spec.replace(/\.png$/, ""));
  if (!config) return new NextResponse("Not found", { status: 404 });

  const overrides = await portraitOverrides();
  return new NextResponse(new Uint8Array(composePortrait(config, { bare: new URL(request.url).searchParams.get("bare") === "1", overrides })), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
