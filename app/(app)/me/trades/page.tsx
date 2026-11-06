import Link from "next/link";
import { requireMe, getPendingTrades, getTokensOf, getToken, getPeople } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { answerTrade, cancelTrade } from "@/lib/actions";
import { ItemArt, TokenImage } from "@/components/badges";
import { itemTitle, tokenReadyAt, type Trade, type TradeItem } from "@/lib/badges";
import { BADGE_MANA, TOKEN_GIFT_MONTHS } from "@/lib/crystr";
import { tokenTitle } from "@/lib/token";
import { ago } from "@/lib/crystr";

/** One side of an offer: a badge, a token, or nothing. */
function Side({
  item,
  token,
  tokenOf,
  empty,
}: {
  item: TradeItem | null;
  token?: { design: unknown; title: string } | null;
  tokenOf?: string;
  empty: string;
}) {
  if (item) {
    const worth = item.kind === "token" ? BADGE_MANA.token : BADGE_MANA.tradable;
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
        <ItemArt item={item} size={item.kind === "token" ? 64 : 42} />
        <div style={{ minWidth: 0 }}>
          <div className="px" style={{ fontSize: 11, lineHeight: 1.5 }}>
            {itemTitle(item).toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>+{worth} max mana</div>
        </div>
      </div>
    );
  }
  if (token) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
        <TokenImage design={token.design} size={64} />
        <div style={{ minWidth: 0 }}>
          <div className="px" style={{ fontSize: 11, lineHeight: 1.5 }}>
            {token.title.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            +{BADGE_MANA.token} max mana{tokenOf ? ` · ${tokenOf}'s own` : ""}
          </div>
        </div>
      </div>
    );
  }
  return <div style={{ fontSize: 12, color: "var(--muted)" }}>{empty}</div>;
}

function Offer({ t, mine, tokens }: { t: Trade; mine: boolean; tokens: Map<string, unknown> }) {
  const other = mine ? t.receiver : t.offerer;
  const offerer = t.offerer;
  const giveToken =
    t.give_token && offerer
      ? { design: tokens.get(t.from_user) ?? null, title: tokenTitle(offerer.display_name, offerer.handle) }
      : null;
  return (
    <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <Link href={`/u/${other?.handle ?? ""}`} style={{ fontSize: 13, fontWeight: 500, color: "inherit" }}>
          {other?.handle ?? "someone"}
        </Link>
        <span className="spacer" />
        <span className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
          {ago(t.created_at)}
        </span>
      </div>

      <div>
        <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)", marginBottom: 5 }}>
          {mine ? "YOU GIVE" : "THEY GIVE"}
        </div>
        <Side item={t.give} token={giveToken} tokenOf={offerer?.handle} empty="Nothing" />
      </div>
      <div>
        <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)", marginBottom: 5 }}>
          {mine ? "FOR THEIR" : "FOR YOUR"}
        </div>
        <Side item={t.want} empty="Nothing. A gift." />
      </div>

      {mine ? (
        <form action={cancelTrade}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="btn btn-sm" style={{ minHeight: 40 }}>
            TAKE IT BACK
          </button>
        </form>
      ) : (
        <form action={answerTrade} style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" name="answer" value="yes" className="btn btn-sm btn-purple" style={{ minHeight: 40, flex: 1 }}>
            YES, TRADE
          </button>
          <button type="submit" name="answer" value="no" className="btn btn-sm" style={{ minHeight: 40, flex: 1 }}>
            NO THANKS
          </button>
        </form>
      )}
    </div>
  );
}

/** Offers waiting on you, and offers of yours waiting on others. */
export default async function TradesPage() {
  const { userId } = await requireMe();
  const [{ incoming, outgoing }, myToken, people] = await Promise.all([getPendingTrades(userId), getToken(userId), getPeople(userId)]);
  const ready = tokenReadyAt(myToken?.last_given_at);
  const tokens = await getTokensOf([...new Set([...incoming, ...outgoing].filter((t) => t.give_token).map((t) => t.from_user))]);

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
      </div>

      <div>
        <h1 className="screen-title">BADGE TRADES</h1>
        <div className="screen-intro">
          A badge for a badge, or a badge for nothing. Nothing moves until the other person says yes, and
          both ceilings are worked out again when it does.
        </div>
      </div>

      <div id="give-token" className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 80 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
          GIVE YOUR TOKEN
        </div>
        {!myToken ? (
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
            You have not made one yet. <Link href="/me/token" style={{ color: "var(--pur-pale)" }}>Make your token</Link>, then pick who gets it here.
          </div>
        ) : ready ? (
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
            Given. You can give it again on {ready.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
              Pick who gets it. They say yes before anything moves, and then the next one is {TOKEN_GIFT_MONTHS} months away.
            </div>
            {people.length === 0 ? (
              <div className="empty">THERE IS NOBODY ELSE IN THE CITY YET</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {people.map((p) => (
                  <Link key={p.id} href={`/u/${p.handle}/trade?give=token`} className="rowcard" style={{ minHeight: 48, padding: "8px 11px" }}>
                    <Avatar person={p} size={28} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{p.handle}</div>
                    <span className="px" style={{ fontSize: 11, color: "var(--dim)" }}>→</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px" style={{ fontSize: 12, color: "var(--mag-soft)" }}>
        WAITING ON YOU
      </div>
      {incoming.length === 0 ? <div className="empty">NO OFFERS WAITING</div> : incoming.map((t) => <Offer key={t.id} t={t} mine={false} tokens={tokens} />)}

      <div className="px" style={{ fontSize: 12, color: "var(--blu-soft)", marginTop: 8 }}>
        WAITING ON THEM
      </div>
      {outgoing.length === 0 ? (
        <div className="empty">
          NOTHING OFFERED
          <br />
          <span style={{ color: "var(--muted)" }}>OFFER ONE FROM SOMEBODY&apos;S PAGE</span>
        </div>
      ) : (
        outgoing.map((t) => <Offer key={t.id} t={t} mine tokens={tokens} />)
      )}
    </div>
  );
}
