import { NextResponse } from "next/server";
import { composePortrait } from "@/lib/portrait/compose.server";
import { unpackPortrait } from "@/lib/portrait/core";

export const runtime = "nodejs";

// /face/<packed>.png — the whole portrait is described by the URL, so this is
// content-addressed: a changed face is a changed URL, and the composed PNG can
// be cached forever. No lookup, no auth, nothing identifying in the path.
export async function GET(
  _request: Request,
  { params }: { params: { spec: string } },
) {
  const config = unpackPortrait(params.spec.replace(/\.png$/, ""));
  if (!config) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(composePortrait(config)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
