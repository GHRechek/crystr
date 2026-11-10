"use client";

import { useState } from "react";
import { Creature, MoveIcon, Stats, TypeIcon } from "@/components/encounter";
import { HistorikalCard } from "@/components/historikal-card";
import { useDecay } from "@/components/decay";
import { corrupt } from "@/lib/crystr";
import { ELEMENT_COLOR, HISTORIKAL, RARITY_COLOR, RARITY_NAME, TYPES, type Element, type Rarity } from "@/lib/historikals";

export type HeldHk = { id: number; slug: string; name: string; rarity: Rarity; types: Element[]; hearts: number; hp: number };

const RARITIES: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

/** Every Historikal you hold, to look through, rarest first. Filter by rarity (the coloured circles) and by
 *  type; tap one for its card (moves, type, hearts, and healing). The lineup is edited from the Historikals
 *  menu beside your portrait, not here. */
export function HistorikalCollection({ list }: { list: HeldHk[] }) {
  const decay = useDecay();
  const [only, setOnly] = useState<Rarity | null>(null);
  const [type, setType] = useState<Element | null>(null);
  const [card, setCard] = useState<HeldHk | null>(null);
  const rest = list
    .filter((h) => (!only || h.rarity === only) && (!type || h.types.includes(type)))
    .sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.name.localeCompare(b.name));
  const count = (r: Rarity) => list.filter((h) => h.rarity === r).length;
  const line = "linear-gradient(90deg, #e0398a, #9184d9 52%, #4c7df0)";

  return (
    <>
      {/* Rarity: a circle per rarity in its colour, the chosen one on a CRYSTR line; then the seven types. */}
      <div role="group" aria-label="Rarity" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {RARITIES.filter((r) => count(r)).map((r) => {
          const on = only === r;
          return (
            <button key={r} type="button" aria-pressed={on} aria-label={`${RARITY_NAME[r]} · ${count(r)}`} title={`${RARITY_NAME[r]} · ${count(r)}`} onClick={() => setOnly(on ? null : r)} style={{ background: "none", border: 0, padding: "4px 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: RARITY_COLOR[r], boxShadow: on ? "0 0 0 2px var(--bg), 0 0 0 3px #fff" : "none", opacity: only && !on ? 0.45 : 1 }} />
              <span className="px" style={{ fontSize: 8, color: on ? "var(--text)" : "var(--muted)" }}>{count(r)}</span>
              <span aria-hidden style={{ width: 22, height: 3, background: on ? line : "transparent" }} />
            </button>
          );
        })}
      </div>
      <div role="group" aria-label="Type" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {TYPES.map((t) => {
          const on = type === t;
          return (
            <button key={t} type="button" aria-pressed={on} aria-label={t} title={t} onClick={() => setType(on ? null : t)} style={{ background: on ? "rgba(255,255,255,.06)" : "none", border: 0, padding: "4px 5px 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: type && !on ? 0.45 : 1 }}>
              <TypeIcon type={t} k={2} />
              <span aria-hidden style={{ width: 18, height: 3, background: on ? line : "transparent" }} />
            </button>
          );
        })}
      </div>
      {/* The rest, a list: the creature, then its name with its hearts beside it, then its types | its moves. */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {rest.map((h) => {
          return (
            <li key={h.id}>
              <button type="button" onClick={() => setCard(h)} aria-label={`${h.name}: open its card`} style={{ width: "100%", border: 0, background: "none", color: "inherit", cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <Creature slug={h.slug} el={h.types[0]} size={56} ko={h.hp <= 0} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="px" style={{ fontSize: 10, lineHeight: 1.35 }}>{corrupt(h.name.toUpperCase(), decay)}</span>
                    <Stats h={h} hp={h.hp} k={1.25} only="hearts" />
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
      {card ? <HistorikalCard hk={{ id: card.id, slug: card.slug, hp: card.hp, types: card.types }} own onClose={() => setCard(null)} /> : null}
    </>
  );
}
