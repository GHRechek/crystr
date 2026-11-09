"use client";

import { useState } from "react";
import { Creature, MoveIcon, Stats } from "@/components/encounter";
import { HistorikalCard } from "@/components/historikal-card";
import { useDecay } from "@/components/decay";
import { corrupt } from "@/lib/crystr";
import { HISTORIKAL, RARITY_COLOR, type Element, type Rarity } from "@/lib/historikals";

export type HeldHk = { id: number; slug: string; name: string; rarity: Rarity; types: Element[]; hearts: number; hp: number };

const RARITIES: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

/** Every Historikal you hold, to look through: your lineup first, then the rest, rarest first. Filter by
 *  rarity; tap one for its card (moves, type, hearts, and healing). */
export function HistorikalCollection({ list, lineup }: { list: HeldHk[]; lineup: number[] }) {
  const decay = useDecay();
  const [only, setOnly] = useState<Rarity | null>(null);
  const [card, setCard] = useState<HeldHk | null>(null);
  const rank = (h: HeldHk) => (lineup.includes(h.id) ? -10 + lineup.indexOf(h.id) : RARITIES.indexOf(h.rarity));
  const shown = list.filter((h) => !only || h.rarity === only).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const count = (r: Rarity) => list.filter((h) => h.rarity === r).length;

  return (
    <>
      <div className="seg" role="radiogroup" aria-label="Show">
        <button type="button" data-on={!only} onClick={() => setOnly(null)}>ALL · {list.length}</button>
        {RARITIES.filter((r) => count(r)).map((r) => (
          <button key={r} type="button" data-on={only === r} onClick={() => setOnly(r)} style={{ color: only === r ? undefined : RARITY_COLOR[r] }}>
            {r.toUpperCase()} · {count(r)}
          </button>
        ))}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: "14px 6px" }}>
        {shown.map((h) => {
          const n = lineup.indexOf(h.id);
          return (
            <li key={h.id}>
              <button type="button" onClick={() => setCard(h)} aria-label={`${h.name}: open its card`} style={{ width: "100%", border: 0, background: "none", color: "inherit", cursor: "pointer", padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span className="px" style={{ fontSize: 8.5, color: "#e0398a", minHeight: 10 }}>{n >= 0 ? `LINEUP · ${n + 1}` : ""}</span>
                <Creature slug={h.slug} el={h.types[0]} size={64} ko={h.hp <= 0} />
                <span className="px" style={{ fontSize: 10, textAlign: "center", lineHeight: 1.35 }}>{corrupt(h.name.toUpperCase(), decay)}</span>
                <Stats h={h} hp={h.hp} k={2} />
                <span style={{ display: "flex", gap: 6 }} aria-hidden>
                  {(HISTORIKAL.get(h.slug)?.moves ?? []).map((m) => <MoveIcon key={m.name} kind={m.kind} fill="var(--muted)" />)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {card ? <HistorikalCard hk={{ id: card.id, slug: card.slug, hp: card.hp, types: card.types }} own lineupPos={lineup.indexOf(card.id)} onClose={() => setCard(null)} /> : null}
    </>
  );
}
