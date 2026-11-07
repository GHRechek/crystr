import Link from "next/link";
import { requireMe, getHistorikals } from "@/lib/data";
import { healHistorikal } from "@/lib/actions";
import { Creature, Stats } from "@/components/encounter";

/** Your Historikals: every creature you hold, how many hearts each has, and where the hurt ones are healed.
 *  Hearts lost in a battle stay lost until healed here, with your own mana: two for each heart. */
export default async function HistorikalsPage() {
  const { userId, profile } = await requireMe();
  const list = await getHistorikals(userId);
  const hurt = list.filter((h) => h.hp < h.hearts).length;
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>YOUR HISTORIKALS</h1>
        <span className="spacer" />
        <Link href="/me/trades" className="px" style={{ fontSize: 10, color: "var(--pur-pale)", textDecoration: "none" }}>EXCHANGE →</Link>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        Creatures to collect, trade and battle, face to face. A good one (usually rare) comes for every three people you help and for every main quest you finish, and one for every five battles you win.
        Hearts lost in a battle stay lost until you heal them here: two mana a heart.
      </p>
      {hurt ? <div className="px" style={{ fontSize: 11, color: "#ff5a7a" }}>{hurt} HURT · YOU HAVE {profile.mana} MANA</div> : null}
      {list.length === 0 ? (
        <div className="empty">NO HISTORIKALS YET</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {list.map((h) => {
            const cost = 2 * (h.hearts - h.hp);
            return (
              <li key={h.id} style={{ background: "var(--blk)", padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: h.hp === 0 ? 0.85 : 1 }}>
                <div style={{ filter: h.hp === 0 ? "grayscale(1) brightness(.6)" : undefined }}><Creature slug={h.slug} size={68} /></div>
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
