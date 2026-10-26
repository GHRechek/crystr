"use client";

import Link from "next/link";
import { useState } from "react";
import { offerTrade } from "@/lib/actions";
import { ItemArt, TokenImage } from "@/components/badges";
import { itemTitle, type BadgeItem } from "@/lib/badges";
import { BADGE_MANA, TOKEN_GIFT_MONTHS } from "@/lib/crystr";
import { tokenTitle } from "@/lib/token";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Row({
  on,
  onPick,
  children,
  disabled,
}: {
  on: boolean;
  onPick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      disabled={disabled}
      className="rowcard"
      style={{
        minHeight: 56,
        borderColor: on ? "var(--pur)" : "var(--edge)",
        background: on ? "rgba(145,132,217,.14)" : "var(--surface)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
      <span className="px" style={{ fontSize: 11, color: on ? "var(--pur-bright)" : "var(--muted)", flex: "none" }}>
        {on ? "✓" : "—"}
      </span>
    </button>
  );
}

function ItemRow({ item }: { item: BadgeItem }) {
  return (
    <>
      <ItemArt item={item} size={item.kind === "token" ? 80 : 42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="px" style={{ fontSize: 11 }}>
          {itemTitle(item).toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>+{item.kind === "token" ? BADGE_MANA.token : BADGE_MANA.tradable} max mana</div>
      </div>
    </>
  );
}

/** What you give, then what you want. The token row carries its own warning: it is one
 *  gift every six months, and giving it starts the clock. */
export function TradeForm({
  toId,
  toHandle,
  mine,
  theirs,
  myToken,
  me,
  preselectToken,
}: {
  toId: string;
  toHandle: string;
  mine: BadgeItem[];
  theirs: BadgeItem[];
  myToken: { design: unknown; readyAt: string | null } | null;
  me: { displayName: string | null; handle: string };
  preselectToken: boolean;
}) {
  const tokenOk = !!myToken && !myToken.readyAt;
  const [give, setGive] = useState<string>(preselectToken && tokenOk ? "token" : "");
  const [want, setWant] = useState<string>("");
  const canOffer = give !== "";
  const next = new Date();
  next.setMonth(next.getMonth() + TOKEN_GIFT_MONTHS);

  return (
    <form action={offerTrade} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="to_id" value={toId} />
      <input type="hidden" name="to_handle" value={toHandle} />
      <input type="hidden" name="give" value={give} />
      <input type="hidden" name="want" value={want} />

      <div className="px" style={{ fontSize: 12, color: "var(--mag-soft)" }}>
        YOU GIVE
      </div>
      <div role="radiogroup" aria-label="What you give" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Row on={give === "token"} onPick={() => setGive("token")} disabled={!tokenOk}>
          {myToken ? (
            <TokenImage design={myToken.design} size={80} />
          ) : (
            <div aria-hidden style={{ width: 80, height: 80, flex: "none", display: "grid", placeItems: "center", color: "var(--dim)", border: "1px dashed var(--edge)", borderRadius: "var(--px-r)" }}>
              ?
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="px" style={{ fontSize: 11 }}>
              {tokenTitle(me.displayName, me.handle).toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {!myToken
                ? "You have not made one yet."
                : myToken.readyAt
                  ? `Given. Again on ${longDate(myToken.readyAt)}.`
                  : `+${BADGE_MANA.token} max mana for them. One gift every ${TOKEN_GIFT_MONTHS} months.`}
            </div>
          </div>
        </Row>
        {!myToken ? (
          <Link href="/me/token" className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            MAKE YOUR TOKEN →
          </Link>
        ) : null}
        {mine.map((it) => (
          <Row key={it.id} on={give === `item:${it.id}`} onPick={() => setGive(`item:${it.id}`)}>
            <ItemRow item={it} />
          </Row>
        ))}
        {mine.length === 0 ? <div className="empty">YOU HOLD NO TRADABLE BADGES YET</div> : null}
      </div>

      {give === "token" ? (
        <div className="banner-note banner-mag" role="status">
          <div className="px" style={{ fontSize: 11, marginBottom: 4 }}>
            ONCE EVERY {TOKEN_GIFT_MONTHS} MONTHS
          </div>
          You are giving your token away. If {toHandle} says yes, you cannot give another until{" "}
          {longDate(next.toISOString())}. The one they hold is theirs to keep or trade on.
        </div>
      ) : null}

      <div className="px" style={{ fontSize: 12, color: "var(--blu-soft)", marginTop: 6 }}>
        FOR THEIR
      </div>
      <div role="radiogroup" aria-label="What you want" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Row on={want === ""} onPick={() => setWant("")}>
          <div style={{ flex: 1, fontSize: 12 }}>Nothing. A gift.</div>
        </Row>
        {theirs.map((it) => (
          <Row key={it.id} on={want === `item:${it.id}`} onPick={() => setWant(`item:${it.id}`)}>
            <ItemRow item={it} />
          </Row>
        ))}
        {theirs.length === 0 ? <div className="empty">{toHandle.toUpperCase()} HOLDS NOTHING TO TRADE YET</div> : null}
      </div>

      <button type="submit" className={`btn btn-lg btn-block${canOffer ? " btn-purple" : ""}`} aria-disabled={!canOffer} disabled={!canOffer}>
        {canOffer ? "MAKE THE OFFER" : "PICK SOMETHING TO GIVE"}
      </button>
    </form>
  );
}
