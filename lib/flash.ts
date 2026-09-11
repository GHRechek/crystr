import { cookies } from "next/headers";
import { FLASH_COOKIE, type Flash } from "@/lib/toast";

// The prototype's toasts survive a server action's redirect by riding along
// in a short-lived cookie. The client component that renders one clears it.

export { EDGE } from "@/lib/toast";
export type { Flash } from "@/lib/toast";

/** Call from a server action. */
export function setFlash(kicker: string, text: string, edge = "#9184d9") {
  cookies().set(FLASH_COOKIE, JSON.stringify({ k: kicker, t: text, e: edge }), {
    path: "/",
    maxAge: 30,
    httpOnly: false,
    sameSite: "lax",
  });
}

/** Call from a server component. */
export function readFlash(): Flash | null {
  const raw = cookies().get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Flash;
    return f && f.t ? f : null;
  } catch {
    return null;
  }
}
