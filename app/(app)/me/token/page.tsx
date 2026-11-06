import Link from "next/link";
import { requireMe, getToken, getPeople } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { tokenReadyAt } from "@/lib/badges";
import { BADGE_MANA, TOKEN_GIFT_MONTHS } from "@/lib/crystr";
import { defaultToken, normalizeToken, tokenTitle } from "@/lib/token";
import { TokenDesigner } from "./designer";

const longDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Your token: design it here, then give it to someone from their page. */
export default async function TokenPage() {
  const { userId, profile } = await requireMe();
  const [token, people] = await Promise.all([getToken(userId), getPeople(userId)]);
  const ready = tokenReadyAt(token?.last_given_at);

  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400, lineHeight: 1.4 }}>
          {tokenTitle(profile.display_name, profile.handle).toUpperCase()} <span style={{ color: "var(--pur-pale)" }}>+{BADGE_MANA.token}</span>
        </h1>
      </div>

      <TokenDesigner start={token ? normalizeToken(token.design) : defaultToken()} fresh={!token} how={token?.how ?? ""} canGive={!!token && !ready} />

      <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
        To give it to someone, use the exchange button on your profile.{" "}
        <Link href="/me/trades#give-token" style={{ color: "var(--pur-pale)" }}>
          Open trades
        </Link>
        .
      </div>
    </div>
  );
}
