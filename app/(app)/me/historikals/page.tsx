import Link from "next/link";
import { requireMe, getHistorikals, getPicksOpen } from "@/lib/data";
import { healHistorikal } from "@/lib/actions";
import { Creature, MoveIcon, Stats } from "@/components/encounter";
import { HISTORIKAL, SUPER, NO_EFFECT, ELEMENT_COLOR, type Element } from "@/lib/historikals";

const up = (s: string) => s.toUpperCase();
/** What a type hits hard (two hearts) and what it can't touch. */
const matchup = (e: Element) => [
  SUPER[e].length ? `STRONG VS ${SUPER[e].map(up).join(", ")}` : null,
  NO_EFFECT[e]?.length ? `CAN'T TOUCH ${NO_EFFECT[e]!.map(up).join(", ")}` : null,
].filter(Boolean).join(" · ");

/** Your Historikals: every creature you hold, how many hearts each has, and where the hurt ones are healed.
 *  Hearts lost in a battle stay lost until healed here, with your own mana: two for each heart. */
export default async function HistorikalsPage() {
  const { userId, profile } = await requireMe();
  const [list, picks] = await Promise.all([getHistorikals(userId), getPicksOpen()]);
  const hurt = list.filter((h) => h.hp < h.hearts).length;
  // Your lineup (the Historikals on show in your badge display) first, in its order; then the rest.
  const lineup = (profile.shown_badges ?? []).filter((k: string) => k.startsWith("i:")).map((k: string) => Number(k.slice(2)));
  const sorted = [...list.filter((h) => lineup.includes(h.id)).sort((a, b) => lineup.indexOf(a.id) - lineup.indexOf(b.id)), ...list.filter((h) => !lineup.includes(h.id))];
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>YOUR HISTORIKALS</h1>
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
      {hurt ? <div className="px" style={{ fontSize: 11, color: "#ff5a7a" }}>{hurt} HURT · YOU HAVE {profile.mana} MANA</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="px" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.6, flex: 1, minWidth: 200 }}>
          MOVES: <MoveIcon kind="sword" /> SWORD CUTS SPELL · <MoveIcon kind="spell" /> SPELL BREAKS ARMOR · <MoveIcon kind="armor" /> ARMOR BLOCKS SWORD
        </div>
        <Link href="/me?badges=1" className="btn btn-sm">EDIT LINEUP →</Link>
      </div>
      {list.length === 0 ? (
        <div className="empty">NO HISTORIKALS YET</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {sorted.map((h) => {
            const cost = 2 * (h.hearts - h.hp);
            const n = lineup.indexOf(h.id);
            const moves = HISTORIKAL.get(h.slug)?.moves ?? [];
            return (
              <li key={h.id} style={{ padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                {n >= 0 ? <div className="px" style={{ fontSize: 9, color: "#e0398a" }}>LINEUP · {n + 1}</div> : null}
                <Creature slug={h.slug} size={68} ko={h.hp === 0} />
                <div className="px" style={{ fontSize: 11, textAlign: "center", lineHeight: 1.4 }}>{h.name}</div>
                <Stats h={h} hp={h.hp} k={2} />
                <div className="px" style={{ fontSize: 8.5, color: ELEMENT_COLOR[h.element], textAlign: "center", lineHeight: 1.5 }}>
                  {up(h.element)}{matchup(h.element) ? ` · ${matchup(h.element)}` : ""}
                </div>
                {/* Its moves: what it can do in a battle. */}
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5, alignSelf: "stretch", alignItems: "center" }}>
                  {moves.map((m) => (
                    <li key={m.name} className="px" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                      <MoveIcon kind={m.kind} /> {up(m.name)}
                    </li>
                  ))}
                </ul>
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
