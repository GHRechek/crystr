"use client";

import { useState } from "react";
import { Creature, MoveIcon, Stats, TypeIcon } from "@/components/encounter";
import { HistorikalCard } from "@/components/historikal-card";
import { useDecay } from "@/components/decay";
import { corrupt } from "@/lib/crystr";
import { ELEMENT_COLOR, HISTORIKAL, RARITY_COLOR, RARITY_NAME, TYPES, type Element, type Rarity } from "@/lib/historikals";

export type HeldHk = { id: number; slug: string; name: string; rarity: Rarity; types: Element[]; hearts: number; hp: number; favorite?: boolean };

const RARITIES: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

/** Every Historikal you hold, to look through, rarest first. Filter by rarity (the coloured circles) and by
 *  type; tap one for its card (moves, type, hearts, and healing). The lineup is edited from the Historikals
 *  menu beside your portrait, not here. */
/** The filter, on one line: a circle per rarity in its colour (a count under each when given), a thin line,
 *  then the seven types, a little smaller than they were. The chosen ones stand on a CRYSTR line. */
export function FilterRow({ rarities, count, rar, setRar, type, setType, ring = "var(--bg)" }: {
  rarities: Rarity[];
  count?: (r: Rarity) => number;
  rar: Rarity | null;
  setRar: (r: Rarity | null) => void;
  type: Element | null;
  setType: (t: Element | null) => void;
  /** The colour behind the chosen circle's white ring. */
  ring?: string;
}) {
  const line = "linear-gradient(90deg, #e0398a, #9184d9 52%, #4c7df0)";
  // Pinned to the top of whatever scrolls, so the list goes by under it. The chosen rarity wears a
  // CRYSTR ring; the chosen type is filled with the gradient.
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "sticky", top: 0, zIndex: 2, background: ring, paddingBottom: 4 }}>
      <div role="group" aria-label="Rarity" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {rarities.map((r) => {
          const on = rar === r;
          const n = count?.(r);
          return (
            <button key={r} type="button" aria-pressed={on} aria-label={n === undefined ? RARITY_NAME[r] : `${RARITY_NAME[r]} · ${n}`} title={RARITY_NAME[r]} onClick={() => setRar(on ? null : r)} style={{ background: "none", border: 0, padding: "4px 2px 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", padding: 2, background: on ? line : "transparent", display: "grid", placeItems: "center" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: RARITY_COLOR[r], boxShadow: on ? `0 0 0 1px ${ring}` : "none", opacity: rar && !on ? 0.45 : 1 }} />
              </span>
              {n === undefined ? null : <span className="px" style={{ fontSize: 7, color: on ? "#fff" : "var(--muted)", lineHeight: 1 }}>{n}</span>}
            </button>
          );
        })}
      </div>
      <span aria-hidden style={{ width: 1, alignSelf: "stretch", margin: "4px 2px", background: "rgba(255,255,255,.25)" }} />
      <div role="group" aria-label="Type" style={{ display: "flex", gap: 2, alignItems: "center" }}>
        {TYPES.map((t) => {
          const on = type === t;
          return (
            <button key={t} type="button" aria-pressed={on} aria-label={t} title={t} onClick={() => setType(on ? null : t)} style={{ background: "none", border: 0, padding: "4px 3px", cursor: "pointer", display: "flex", alignItems: "center", opacity: type && !on ? 0.45 : 1 }}>
              <TypeIcon type={t} k={1.5} grad={on} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HistorikalCollection({ list, ring, drag, lifted, inLineup, onOpen, dense }: {
  list: HeldHk[];
  ring?: string;
  /** Smaller pictures and tighter rows, so the panel's list shows more at once. */
  dense?: boolean;
  /** Pointer handlers that let a row's creature be dragged (into a lineup slot, in the Historikals panel).
   *  Only the creature takes them, so the rest of the row still scrolls the list on a touch screen. */
  drag?: (h: HeldHk) => React.HTMLAttributes<HTMLElement>;
  /** The row whose creature is being held and dragged right now: it is gone from its place until dropped. */
  lifted?: (h: HeldHk) => boolean;
  /** Rows already in the lineup sit greyed out. */
  inLineup?: (h: HeldHk) => boolean;
  /** Opens the card somewhere else (the panel keeps it above itself); otherwise this shows it. */
  onOpen?: (h: HeldHk) => void;
}) {
  const decay = useDecay();
  const [only, setOnly] = useState<Rarity | null>(null);
  const [type, setType] = useState<Element | null>(null);
  const [card, setCard] = useState<HeldHk | null>(null);
  const rest = list
    .filter((h) => (!only || h.rarity === only) && (!type || h.types.includes(type)))
    // Your favourites first, then rarest first.
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.name.localeCompare(b.name));
  const count = (r: Rarity) => list.filter((h) => h.rarity === r).length;

  return (
    <>
      <FilterRow rarities={[...RARITIES].reverse().filter((r) => count(r))} count={count} rar={only} setRar={setOnly} type={type} setType={setType} ring={ring} />
      {/* The rest, a list: the creature, then its name with its hearts beside it, then its types | its moves. */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: dense ? 2 : 4 }}>
        {rest.map((h) => {
          return (
            <li key={h.id}>
              <button type="button" onClick={() => (onOpen ?? setCard)(h)} aria-label={`${h.name}: open its card${drag ? "; drag its picture into your lineup" : ""}`} style={{ width: "100%", border: 0, background: "none", color: "inherit", cursor: "pointer", padding: dense ? "2px 0" : "4px 0", display: "flex", alignItems: "center", gap: dense ? 10 : 12, textAlign: "left", WebkitTapHighlightColor: "transparent", visibility: lifted?.(h) ? "hidden" : "visible", opacity: inLineup?.(h) ? 0.4 : 1 }}>
                <span {...(drag ? drag(h) : {})} style={drag ? { touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", cursor: "grab", lineHeight: 0 } : { lineHeight: 0 }}>
                  <Creature slug={h.slug} el={h.types[0]} size={dense ? 40 : 56} ko={h.hp <= 0} />
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: dense ? 5 : 7 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="px" style={{ fontSize: 10, lineHeight: 1.35 }}>{corrupt(h.name.toUpperCase(), decay)}</span>
                    <Stats h={h} hp={h.hp} k={1.25} only="hearts" fav={!!h.favorite} />
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="px" style={{ fontSize: 8.5 }}>{h.types.map((t, i) => <span key={t} style={{ color: ELEMENT_COLOR[t] }}>{i ? " / " : ""}{corrupt(t.toUpperCase(), decay)}</span>)}</span>
                    <span aria-hidden style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1 }}>|</span>
                    <span style={{ display: "flex", gap: 4 }} aria-hidden>
                      {(HISTORIKAL.get(h.slug)?.moves ?? []).map((m) => <MoveIcon key={m.name} kind={m.kind} k={1.25} fill="var(--muted)" />)}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {card ? <HistorikalCard hk={{ id: card.id, slug: card.slug, hp: card.hp, types: card.types, favorite: card.favorite }} own onClose={() => setCard(null)} onFavorite={(on) => setCard({ ...card, favorite: on })} /> : null}
    </>
  );
}
