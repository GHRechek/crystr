import { NextResponse } from "next/server";
import { composeToken } from "@/lib/token.server";
import { unpackToken } from "@/lib/token";

export const runtime = "nodejs";

// /token/<packed>.png — like /face, the URL describes the whole picture, so it is
// cached forever and carries nothing identifying.
export async function GET(_request: Request, props: { params: Promise<{ spec: string }> }) {
  const params = await props.params;
  const design = unpackToken(params.spec.replace(/\.png$/, ""));
  if (!design) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(composeToken(design)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
