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
  // Your lineup (the Historikals on show in your badge display) first, in its order; then the rest.
  const lineup = (profile.shown_badges ?? []).filter((k: string) => k.startsWith("i:")).map((k: string) => Number(k.slice(2)));
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>MY HISTORIKALS · {list.length}</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        Creatures to collect, trade and battle, face to face. You earn draws: a summon (usually rare) for every three people you help and every main quest you finish, a find for each first step, every three side quests and every five battles you win. Open them from the monster button beside your portrait.
        Hearts lost in a battle stay lost until you heal them here: two mana a heart.
      </p>
      {picks > 0 ? (
        <Link href="/me/historikals/pick" className="px" style={{ display: "block", padding: "14px 16px", background: "#8a5a0c", boxShadow: "0 0 0 3px #f2b544", color: "#fff", fontSize: 12, lineHeight: 1.6, textDecoration: "none", textAlign: "center" }}>
          ★ A GIFT: PICK ANY HISTORIKAL{picks > 1 ? ` · ${picks} PICKS` : ""} ★<br /><span style={{ color: "#ffe38b" }}>CHOOSE YOURS →</span>
        </Link>
      ) : null}
      {hurt ? <div className="px" style={{ fontSize: 11, color: "#ff5a7a" }}>{hurt} HURT · TAP ONE TO HEAL IT · YOU HAVE {profile.mana} MANA</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="px" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.6, flex: 1, minWidth: 200 }}>
          TAP ONE FOR ITS MOVES · <MoveIcon kind="sword" /> SWORD CUTS SPELL · <MoveIcon kind="spell" /> SPELL BREAKS ARMOR · <MoveIcon kind="armor" /> ARMOR BLOCKS SWORD
        </div>
        <Link href="/me?badges=1" className="btn btn-sm">EDIT LINEUP →</Link>
      </div>
      {list.length === 0 ? <div className="empty">NO HISTORIKALS YET</div> : <HistorikalCollection list={list} lineup={lineup} />}
    </div>
  );
}
