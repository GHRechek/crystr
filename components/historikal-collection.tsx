"use client";

import { useState } from "react";
import { Creature, MoveIcon, Stats, TypeIcon } from "@/components/encounter";
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
  // The lineup stands in a row at the top; everything else is the list below it.
  const front = shown.filter((h) => lineup.includes(h.id));
  const rest = shown.filter((h) => !lineup.includes(h.id));

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
      {front.length ? (
        // The lineup: its types, the creature, its name, its hearts, its moves, top to bottom.
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {front.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => setCard(h)} aria-label={`${h.name}, lineup ${lineup.indexOf(h.id) + 1}: open its card`} style={{ width: "100%", border: 0, background: "none", color: "inherit", cursor: "pointer", padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ display: "flex", gap: 4 }} aria-label={h.types.join(" / ")}>{h.types.map((t) => <TypeIcon key={t} type={t} k={1.5} />)}</span>
                <Creature slug={h.slug} el={h.types[0]} size={64} ko={h.hp <= 0} />
                <span className="px" style={{ fontSize: 10, textAlign: "center", lineHeight: 1.35 }}>{corrupt(h.name.toUpperCase(), decay)}</span>
                <Stats h={h} hp={h.hp} k={1.5} only="hearts" />
                <span style={{ display: "flex", gap: 5 }} aria-hidden>
                  {(HISTORIKAL.get(h.slug)?.moves ?? []).map((m) => <MoveIcon key={m.name} kind={m.kind} k={1.5} fill="var(--muted)" />)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {/* The rest, a list: the creature, then its name with its types beside it, then its hearts | its moves. */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {rest.map((h) => {
          return (
            <li key={h.id}>
              <button type="button" onClick={() => setCard(h)} aria-label={`${h.name}: open its card`} style={{ width: "100%", border: 0, background: "none", color: "inherit", cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <Creature slug={h.slug} el={h.types[0]} size={56} ko={h.hp <= 0} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="px" style={{ fontSize: 10, lineHeight: 1.35 }}>{corrupt(h.name.toUpperCase(), decay)}</span>
                    <span style={{ display: "flex", gap: 4 }} aria-label={h.types.join(" / ")}>{h.types.map((t) => <TypeIcon key={t} type={t} k={1.5} />)}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Stats h={h} hp={h.hp} k={1.5} only="hearts" />
                    <span aria-hidden style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1 }}>|</span>
                    <span style={{ display: "flex", gap: 5 }} aria-hidden>
                      {(HISTORIKAL.get(h.slug)?.moves ?? []).map((m) => <MoveIcon key={m.name} kind={m.kind} k={1.5} fill="var(--muted)" />)}
                    </span>
                  </span>
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
