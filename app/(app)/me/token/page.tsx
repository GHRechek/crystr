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
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          MAKING ONE IS FREE
        </div>
      </div>

      <div>
        <h1 className="screen-title">{tokenTitle(profile.display_name, profile.handle).toUpperCase()}</h1>
        <div className="screen-intro">
          A badge of your own: a shape in your colours, and two items on it. Whoever you give it to
          holds {BADGE_MANA.token} more max mana. You can give it once every {TOKEN_GIFT_MONTHS} months.
        </div>
      </div>

      <TokenDesigner start={token ? normalizeToken(token.design) : defaultToken()} fresh={!token} />

      <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
          GIVE IT
        </div>
        {!token ? (
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>Keep a design first, then pick who gets it.</div>
        ) : ready ? (
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
            Given. You can give it again on {longDate(ready)}.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
              Pick who gets it. They say yes before anything moves, and then the next one is{" "}
              {TOKEN_GIFT_MONTHS} months away.
            </div>
            {people.length === 0 ? (
              <div className="empty">THERE IS NOBODY ELSE IN THE CITY YET</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {people.map((p) => (
                  <Link
                    key={p.id}
                    href={`/u/${p.handle}/trade?give=token`}
                    className="rowcard"
                    style={{ minHeight: 48, padding: "8px 11px" }}
                  >
                    <Avatar person={p} size={28} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{p.handle}</div>
                    <span className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
