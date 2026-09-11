import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Google redirects here after sign-in. Exchanging the code creates the
// Supabase session, and — on a first-ever sign-in to CRYSTR — the
// on_auth_user_created database trigger creates this user's CRYSTR profile
// automatically, independent of any other app.
//
// Every failure path carries a reason back to /login. A silent bounce here
// looks exactly like a broken app, and the usual cause (this URL missing
// from the Supabase redirect allow-list) is otherwise invisible.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const bounce = (reason: string) =>
    NextResponse.redirect(`${origin}/login?e=${encodeURIComponent(reason)}`);

  // Supabase passes its own failures through as query params.
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return bounce(providerError);

  if (!code) {
    return bounce(
      "The gate sent you back without a code. Check that this app's /auth/callback URL is in the Supabase redirect allow-list.",
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return bounce(error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
