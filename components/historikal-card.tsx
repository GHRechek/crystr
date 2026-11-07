"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Creature, MoveIcon, Stats } from "@/components/encounter";
import { ELEMENT_COLOR, HISTORIKAL, NO_EFFECT, RARITY_COLOR, SUPER, type Element } from "@/lib/historikals";

const up = (s: string) => s.toUpperCase();

/** What a type hits hard (two hearts), and what it can't touch. */
export const matchup = (e: Element) =>
  [SUPER[e].length ? `STRONG VS ${SUPER[e].map(up).join(", ")}` : null, NO_EFFECT[e]?.length ? `CAN'T TOUCH ${NO_EFFECT[e]!.map(up).join(", ")}` : null]
    .filter(Boolean)
    .join(" · ");

/** One Historikal, close up: the creature, its rarity, type and what that's strong against, its hearts,
 *  and where it came from. Your own show their moves; someone else's keep them hidden, as they are in a
 *  battle until used. */
export function HistorikalCard({
  hk,
  line,
  own,
  lineupPos,
  onEditLineup,
  onClose,
}: {
  hk: { slug: string; hp: number };
  /** Where it came from, as its tooltip says. */
  line?: string;
  own?: boolean;
  /** Its place in the lineup (0, 1, 2), if it's in it. */
  lineupPos?: number;
  onEditLineup?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const h = HISTORIKAL.get(hk.slug);
  if (!h) return null;
  const colour = RARITY_COLOR[h.rarity];
  const ko = hk.hp <= 0;
  const hurt = hk.hp < h.hearts;
  return (
    <div role="dialog" aria-label={h.name} className="hk-card-wrap" onClick={onClose}>
      <div className="hk-card" onClick={(e) => e.stopPropagation()}>
        {lineupPos !== undefined && lineupPos >= 0 ? <div className="px" style={{ fontSize: 10, color: "#e0398a" }}>LINEUP · {lineupPos + 1}</div> : null}
        <Creature slug={h.slug} size={120} ko={ko} />
        <div className="px" style={{ fontSize: 18, color: colour, textAlign: "center" }}>{up(h.name)}</div>
        <div className="px" style={{ fontSize: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: colour }}>{up(h.rarity)}</span>
          <Stats h={{ id: 0, slug: h.slug, name: h.name, rarity: h.rarity, element: h.element, hearts: h.hearts }} hp={hk.hp} k={2} />
          {ko ? <span style={{ color: "#ff5a7a" }}>KNOCKED OUT</span> : null}
        </div>
        <div className="px" style={{ fontSize: 10, color: ELEMENT_COLOR[h.element], textAlign: "center", lineHeight: 1.6 }}>
          {up(h.element)}{matchup(h.element) ? ` · ${matchup(h.element)}` : ""}
        </div>
        <div className="hk-card-moves">
          <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>MOVES</div>
          {own ? (
            h.moves.map((m) => (
              <div key={m.name} className="px" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                <MoveIcon kind={m.kind} /> {up(m.name)} <span style={{ color: "var(--muted)", fontSize: 9 }}>{up(m.kind)}</span>
              </div>
            ))
          ) : (
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{h.moves.length} MOVES · ??? UNTIL YOU SEE THEM IN A BATTLE</div>
          )}
        </div>
        {line ? <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", textAlign: "center" }}>{line}</div> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {own && hurt ? <Link href="/me/historikals" className="btn btn-sm" style={{ background: "#e0398a", color: "#fff" }}>{ko ? "REVIVE" : "HEAL"} · {2 * (h.hearts - hk.hp)} MANA</Link> : null}
          {own && onEditLineup ? <button type="button" className="btn btn-sm" onClick={() => { onClose(); onEditLineup(); }}>EDIT LINEUP</button> : null}
          <button type="button" className="btn btn-sm" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
