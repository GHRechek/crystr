import Link from "next/link";
import { requireMe, getHistorikals, getPicksOpen } from "@/lib/data";
import { MoveIcon } from "@/components/encounter";
import { HistorikalCollection } from "@/components/historikal-collection";

/** Your Historikals: every creature you hold, how many hearts each has, and where the hurt ones are healed.
 *  Hearts lost in a battle stay lost until healed here, with your own mana: two for each heart. */
export default async function HistorikalsPage() {
  const { userId, profile } = await requireMe();
  const [list, picks] = await Promise.all([getHistorikals(userId), getPicksOpen()]);
  const hurt = list.filter((h) => h.hp < h.hearts).length;
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>MY HISTORIKALS · {list.length}</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        Collect, trade and battle, face to face. Quests, helping people and winning battles earn you draws. Heal hurt ones here, two mana a heart.
      </p>
      {picks > 0 ? (
        <Link href="/me/historikals/pick" className="px" style={{ display: "block", padding: "14px 16px", background: "#8a5a0c", boxShadow: "0 0 0 3px #f2b544", color: "#fff", fontSize: 12, lineHeight: 1.6, textDecoration: "none", textAlign: "center" }}>
          ★ A GIFT: PICK ANY HISTORIKAL{picks > 1 ? ` · ${picks} PICKS` : ""} ★<br /><span style={{ color: "#ffe38b" }}>CHOOSE YOURS →</span>
        </Link>
      ) : null}
      {hurt ? <div className="px" style={{ fontSize: 11, color: "#ff5a7a" }}>{hurt} HURT · TAP ONE TO HEAL IT · YOU HAVE {profile.mana} MANA</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="px" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.6, flex: 1, minWidth: 200 }}>
          <MoveIcon kind="sword" /> PIERCE CUTS <MoveIcon kind="spell" /> SOFT · <MoveIcon kind="spell" /> SOFT WRAPS <MoveIcon kind="armor" /> HARD · <MoveIcon kind="armor" /> HARD BLOCKS <MoveIcon kind="sword" /> PIERCE
        </div>
      </div>
      {list.length === 0 ? <div className="empty">NO HISTORIKALS YET</div> : <HistorikalCollection list={list} />}
    </div>
  );
}
