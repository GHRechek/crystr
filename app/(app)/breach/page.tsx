import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireMe, peekOverride } from "@/lib/data";
import { BREACH_COOKIE, KEY_PATTERN } from "@/lib/breach";
import { Breach } from "./breach";

/** Where a scanned override key ends up, once the person is signed in. A live key plays
 *  the break-in and lets them past the registry; a dead one says so; no key at all sends
 *  them to the form. */
export default async function BreachPage() {
  const { profile } = await requireMe();
  const code = (await cookies()).get(BREACH_COOKIE)?.value ?? "";
  const welcoming = profile.onboarded === false;
  if (!KEY_PATTERN.test(code)) redirect(welcoming ? "/welcome" : "/");

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
      <Shell kicker="DEAD KEY">
        <p>This key opens nothing now. Contact your local CRYSTR administrator for a live one.</p>
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
