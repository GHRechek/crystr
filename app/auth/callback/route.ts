import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import type { LoginProblem } from "@/lib/login-problems";

// Google redirects here after sign-in. Exchanging the code creates the
// Supabase session, and — on a first-ever sign-in to CRYSTR — the
// on_auth_user_created database trigger creates this user's CRYSTR profile
// automatically, independent of any other app.
//
// Every failure path carries a reason code back to /login. A silent bounce here
// looks exactly like a broken app, and the usual cause (this URL missing
// from the Supabase redirect allow-list) is otherwise invisible.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only ever send people somewhere on this site: a path, not "//evil.com" or "/\\evil.com".
  const asked = searchParams.get("next") ?? "/";
  const next = /^\/(?![/\\])/.test(asked) ? asked : "/";

  // The login page shows a fixed sentence for each code, never text taken from the
  // address, so a crafted link cannot put its own words on our login screen. The
  // detail goes to the server log, where the person fixing it will look.
  const bounce = (code: LoginProblem, detail?: string) => {
    if (detail) console.error(`auth/callback ${code}:`, detail);
    return NextResponse.redirect(`${origin}/login?e=${code}`);
  };

  // Supabase passes its own failures through as query params.
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return bounce("provider", providerError);

  if (!code) return bounce("nocode");

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return bounce("exchange", error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
