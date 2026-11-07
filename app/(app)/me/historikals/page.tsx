import Link from "next/link";
import { requireMe, getHistorikals, getPicksOpen } from "@/lib/data";
import { healHistorikal } from "@/lib/actions";
import { Creature, Stats } from "@/components/encounter";

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
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>YOUR HISTORIKALS</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        Creatures to collect, trade and battle, face to face. A good one (usually rare) comes for every three people you help and for every main quest you finish, and one for every five battles you win.
        Hearts lost in a battle stay lost until you heal them here: two mana a heart.
      </p>
      {picks > 0 ? (
        <Link href="/me/historikals/pick" className="px" style={{ display: "block", padding: "14px 16px", background: "#8a5a0c", boxShadow: "0 0 0 3px #f2b544", color: "#fff", fontSize: 12, lineHeight: 1.6, textDecoration: "none", textAlign: "center" }}>
          ★ A GIFT: PICK ANY HISTORIKAL{picks > 1 ? ` · ${picks} PICKS` : ""} ★<br /><span style={{ color: "#ffe38b" }}>CHOOSE YOURS →</span>
        </Link>
      ) : null}
      {hurt ? <div className="px" style={{ fontSize: 11, color: "#ff5a7a" }}>{hurt} HURT · YOU HAVE {profile.mana} MANA</div> : null}
      {list.length === 0 ? (
        <div className="empty">NO HISTORIKALS YET</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {list.map((h) => {
            const cost = 2 * (h.hearts - h.hp);
            return (
              <li key={h.id} style={{ padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Creature slug={h.slug} size={68} ko={h.hp === 0} />
                <div className="px" style={{ fontSize: 11, textAlign: "center", lineHeight: 1.4 }}>{h.name}</div>
                <Stats h={h} hp={h.hp} k={2} />
                {cost > 0 ? (
                  <form action={healHistorikal}>
                    <input type="hidden" name="item" value={h.id} />
                    <button type="submit" className="btn btn-sm" style={{ background: profile.mana >= cost ? "#e0398a" : undefined, color: "#fff", minHeight: 32 }}>
                      {h.hp === 0 ? "REVIVE" : "HEAL"} · {cost} MANA
                    </button>
                  </form>
                ) : (
                  <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>READY TO FIGHT</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
