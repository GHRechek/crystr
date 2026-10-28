import { NextResponse, type NextRequest } from "next/server";
import { BREACH_COOKIE, BREACH_MINUTES, KEY_PATTERN } from "@/lib/breach";

/** Where a witch's QR code points. Scanning it lands here: the key goes into a cookie and
 *  the person is sent on to the breach, by way of the sign-in and the terms if they are new
 *  (the cookie waits). Nothing is checked here; the breach page does that, signed in. A
 *  malformed code sets nothing, and the breach page sends them to the registry. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const res = NextResponse.redirect(new URL("/breach", request.url));
  if (KEY_PATTERN.test(code)) {
    res.cookies.set(BREACH_COOKIE, code, {
      path: "/",
      maxAge: BREACH_MINUTES * 60,
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return res;
}
