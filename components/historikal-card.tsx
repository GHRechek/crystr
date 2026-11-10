"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Creature, MoveIcon, Stats } from "@/components/encounter";
import { favoriteHistorikal, healHistorikal } from "@/lib/actions";
import { useDecay } from "@/components/decay";
import { corrupt } from "@/lib/crystr";
import { ELEMENT_COLOR, HISTORIKAL, RARITY_COLOR, RARITY_NAME, SUPER, type Element } from "@/lib/historikals";

const up = (s: string) => s.toUpperCase();

/** What a creature hits hard (two hearts): what its first type beats. */
export const matchup = (e: Element) => `STRONG VS ${SUPER[e].map(up).join(", ")}`;

/** One Historikal, close up: the creature, its rarity, type and what that's strong against, its hearts,
 *  and where it came from. Your own show their moves; someone else's keep them hidden, as they are in a
 *  battle until used. */
export function HistorikalCard({
  hk,
  line,
  own,
  known,
  lineupPos,
  onEditLineup,
  onFavorite,
  onClose,
}: {
  /** types: what this copy is right now, if it rolls or changes its type. */
  hk: { slug: string; hp: number; id?: number; types?: Element[]; favorite?: boolean };
  /** Where it came from, as its tooltip says. */
  line?: string;
  own?: boolean;
  /** Someone else's, and you hold one too: you know it, so its hearts, types and the rest show. Without
   *  that, a stranger's Historikal gives away only its picture, its rarity and its name. */
  known?: boolean;
  /** Its place in the lineup (0, 1, 2), if it's in it. */
  lineupPos?: number;
  onEditLineup?: () => void;
  /** The heart was tapped: on or off, so whatever opened the card can recolour at once. */
  onFavorite?: (on: boolean) => void;
  onClose: () => void;
}) {
  // The heart flips the moment it is tapped; the save follows.
  const [fav, setFav] = useState(!!hk.favorite);
  useEffect(() => setFav(!!hk.favorite), [hk.favorite]);
  const decay = useDecay();
  const eat = (t: string) => corrupt(t, decay);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const h = HISTORIKAL.get(hk.slug);
  if (!h) return null;
  const colour = RARITY_COLOR[h.rarity];
  const types = hk.types?.length ? hk.types : h.types;
  const ko = hk.hp <= 0;
  const hurt = hk.hp < h.hearts;
  return (
    <div role="dialog" aria-label={h.name} className="hk-card-wrap" onClick={onClose}>
      <div className="hk-card" onClick={(e) => e.stopPropagation()}>
        <Creature slug={h.slug} el={types[0]} size={120} ko={ko} />
        <div className="px" style={{ fontSize: 10, color: colour, marginBottom: -6 }}>{up(RARITY_NAME[h.rarity])}</div>
        <div className="px" style={{ fontSize: 18, color: colour, textAlign: "center" }}>{eat(up(h.name))}</div>
        {!own && !known ? (
          <>
            <div className="px" style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>{eat("??? · HOLD ONE YOURSELF TO KNOW IT")}</div>
            <button type="button" className="btn btn-sm" onClick={onClose}>CLOSE</button>
          </>
        ) : (
        <>
        <div className="px" style={{ fontSize: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <Stats h={{ id: 0, slug: h.slug, name: h.name, rarity: h.rarity, types, hearts: h.hearts }} hp={hk.hp} k={2} fav={own && fav} />
          {ko ? <span style={{ color: "#ff5a7a" }}>KNOCKED OUT</span> : null}
        </div>
        <div className="px" style={{ fontSize: 10, textAlign: "center", lineHeight: 1.6 }}>
          {types.map((t, i) => <span key={t} style={{ color: ELEMENT_COLOR[t] }}>{i ? " / " : ""}{eat(up(t))}</span>)}
          <span style={{ color: ELEMENT_COLOR[types[0]] }}>{eat(` · ${matchup(types[0])}`)}</span>
          {h.shift ? <div style={{ color: "var(--muted)" }}>{eat("ITS TYPE CHANGES AFTER EVERY BATTLE")}</div> : null}
        </div>
        <div className="hk-card-moves">
          <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>MOVES</div>
          {own ? (
            h.moves.map((m) => (
              <div key={m.name} className="px" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                <MoveIcon kind={m.kind} /> {eat(up(m.name))} <span style={{ color: "var(--muted)", fontSize: 9 }}>{up(m.kind.replace("+", " & "))}</span>
              </div>
            ))
          ) : (
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{h.moves.length} MOVES · ??? UNTIL YOU SEE THEM IN A BATTLE</div>
          )}
        </div>
        {line ? <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", textAlign: "center" }}>{eat(line)}</div> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {own && hurt ? (
            hk.id ? (
              // Two mana a heart, from your own.
              <form action={healHistorikal}>
                <input type="hidden" name="item" value={hk.id} />
                <button type="submit" className="btn btn-sm" style={{ background: "#e0398a", color: "#fff" }}>{ko ? "REVIVE" : "HEAL"} · {2 * (h.hearts - hk.hp)} MANA</button>
              </form>
            ) : (
              <Link href="/me/historikals" className="btn btn-sm" style={{ background: "#e0398a", color: "#fff" }}>{ko ? "REVIVE" : "HEAL"} · {2 * (h.hearts - hk.hp)} MANA</Link>
            )
          ) : null}
          {own && hk.id ? (
            // A heart: it goes to the top of your list.
            <form action={favoriteHistorikal} onSubmit={() => { setFav(!fav); onFavorite?.(!fav); }}>
              <input type="hidden" name="item" value={hk.id} />
              <input type="hidden" name="on" value={fav ? "0" : "1"} />
              <button type="submit" className="btn btn-sm" aria-pressed={fav} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Stats h={{ id: 0, slug: h.slug, name: h.name, rarity: h.rarity, hearts: 1 }} k={1.5} only="hearts" fav={fav} />
                {fav ? <span className="crystr-text">FAVOURITE</span> : "FAVOURITE?"}
              </button>
            </form>
          ) : null}
          {own && onEditLineup ? <button type="button" className="btn btn-sm" onClick={() => { onClose(); onEditLineup(); }}>EDIT LINEUP</button> : null}
          <button type="button" className="btn btn-sm" onClick={onClose}>CLOSE</button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
