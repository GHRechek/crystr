import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireMe, peekOverride } from "@/lib/data";
import { BREACH_COOKIE, HANDLE_PATTERN, KEY_PATTERN, SCAN_COOKIE } from "@/lib/breach";
import { createClient } from "@/lib/supabase/server";
import { Breach } from "./breach";

/** Where a scanned override key ends up, once the person is signed in. A witch's key plays
 *  the break-in and lets them past the registry; a code the City does not know says so; no
 *  key at all sends them to the form. */
export default async function BreachPage() {
  const { profile } = await requireMe();
  const jar = await cookies();
  const code = jar.get(BREACH_COOKIE)?.value ?? "";
  const welcoming = profile.onboarded === false;
  if (!KEY_PATTERN.test(code)) {
    // No old-style key: a witch's profile, scanned, is one.
    const handle = jar.get(SCAN_COOKIE)?.value ?? "";
    if (!welcoming || !HANDLE_PATTERN.test(handle)) redirect(welcoming ? "/welcome" : "/");
    const { data: w } = await createClient().from("profiles").select("handle").eq("handle", handle).eq("is_witch", true).maybeSingle();
    if (!w) redirect("/welcome");
    return <Breach witch={String(w.handle)} />;
  }

  if (!welcoming) {
    return (
      <Shell kicker="NOTHING TO BREAK INTO">
        <p>The records already have you. The key is for someone the registry cannot take.</p>
        <Link href="/" className="btn btn-block" style={{ minHeight: 42 }}>
          BACK TO THE CITY
        </Link>
      </Shell>
    );
  }

  const peek = await peekOverride(code);
  if (!peek.ok) {
    return (
      <Shell kicker="NOT A KEY">
        <p>This code opens nothing. Contact your local CRYSTR administrator for their key.</p>
        <Link href="/welcome" className="btn btn-block" style={{ minHeight: 42 }}>
          THE REGISTRY
        </Link>
      </Shell>
    );
  }

  return <Breach witch={peek.witch} />;
}

function Shell({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="pad" style={{ gap: 12 }}>
      <div className="tile" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)", letterSpacing: ".07em" }}>
          {kicker}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-3)", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      </div>
    </div>
  );
}
