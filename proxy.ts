import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase auth session fresh on every request so a signed-in
// user's cookies don't silently expire mid-visit.
/** The names the City used to answer to. Anyone arriving on one is sent, path and all, to the
 *  real address: crystr.app. (crystr.vercel.app is redirected by Vercel itself.) */
const OLD_HOSTS = new Set(["cryster.app", "www.cryster.app", "www.crystr.app"]);
const HOME = "https://crystr.app";

export async function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (OLD_HOSTS.has(host)) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`${HOME}${pathname}${search}`, 308);
  }

  // Next prefetches <Link> targets aggressively — six routes can arrive in
  // the same second. Supabase rotates refresh tokens, so when several of
  // those requests try to refresh at once the losers present a token that
  // has already been spent, and the person is quietly signed out. A
  // prefetch only needs to warm the route, so let it past untouched.
  // Layouts can't see the path they are rendering, so pass it along for the welcome gate.
  const forward = new Headers(request.headers);
  forward.set("x-pathname", request.nextUrl.pathname);
  const next = () => NextResponse.next({ request: { headers: forward } });

  if (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return next();
  }

  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = next();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  // A profile opened from a QR code is remembered for a while: a witch's profile is the key past the
  // registry, and this carries it through the sign-in.
  const scanned = /^\/u\/([a-z0-9_.-]{1,40})$/i.exec(request.nextUrl.pathname)?.[1];
  if (scanned) response.cookies.set("crystr.scan", scanned.toLowerCase(), { path: "/", maxAge: 30 * 60, httpOnly: true, sameSite: "lax" });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|face/|token/).*)"],
};
