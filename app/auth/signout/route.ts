import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Another site must not be able to sign someone out by posting a form here.
  // Browsers say where a post came from; refuse it if that is not this site.
  const origin = request.headers.get("origin");
  if (origin ? origin !== new URL(request.url).origin : request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse("Not from here", { status: 403 });
  }

  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
