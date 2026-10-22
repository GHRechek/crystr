import { cookies } from "next/headers";
import { EDGE, FLASH_COOKIE, type Flash } from "@/lib/toast";

// The prototype's toasts survive a server action's redirect by riding along
// in a short-lived cookie. The client component that renders one clears it.

export { EDGE } from "@/lib/toast";
export type { Flash } from "@/lib/toast";

/** Call from a server action. */
export async function setFlash(kicker: string, text: string, edge = "#9184d9") {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify({ k: kicker, t: text, e: edge }), {
    path: "/",
    maxAge: 30,
    httpOnly: false,
    sameSite: "lax",
  });
}

/** Call from a server component. */
export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    // The cookie is the browser's to edit, so trust none of it: plain short text, and
    // one of our own three colours.
    const f = JSON.parse(raw) as Partial<Flash> | null;
    if (!f || typeof f.t !== "string" || !f.t) return null;
    const edges: string[] = Object.values(EDGE);
    return {
      k: typeof f.k === "string" ? f.k.slice(0, 40) : "",
      t: f.t.slice(0, 240),
      e: typeof f.e === "string" && edges.includes(f.e) ? f.e : EDGE.purple,
    };
  } catch {
    return null;
  }
}
