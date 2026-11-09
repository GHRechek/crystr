"use client";

import Link from "next/link";
import { useState } from "react";
import { Creature } from "@/components/encounter";
import { ELEMENT_COLOR, HISTORIKALS, RARITIES, RARITY_COLOR, type Rarity } from "@/lib/historikals";

/** The creature editor's index: every creature, found by name, slug, type or rarity. */
export function CreatureIndex() {
  const [q, setQ] = useState("");
  const [rar, setRar] = useState<Rarity | "retired" | null>(null);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = HISTORIKALS.filter((h) => (rar === "retired" ? h.retired : !h.retired && (!rar || h.rarity === rar)))
    .filter((h) => words.every((w) => `${h.name} ${h.slug} ${h.types.join(" ")} ${h.rarity}`.toLowerCase().includes(w)));
  return (
    <>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a creature: name, type, rarity…" aria-label="Find a creature" className="input" style={{ width: "100%" }} />
      <div className="seg" role="radiogroup" aria-label="Show" style={{ flexWrap: "wrap" }}>
        <button type="button" data-on={!rar} onClick={() => setRar(null)}>ALL</button>
        {[...RARITIES].reverse().map((r) => (
          <button key={r} type="button" data-on={rar === r} onClick={() => setRar(r)} style={{ color: rar === r ? undefined : RARITY_COLOR[r] }}>{r.toUpperCase()}</button>
        ))}
        <button type="button" data-on={rar === "retired"} onClick={() => setRar("retired")}>OFF</button>
      </div>
      <div className="px" style={{ fontSize: 9.5, color: "var(--muted)" }}>{list.length} CREATURES</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {list.map((h) => (
          <li key={h.slug}>
            <Link href={`/creatures/${h.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0", color: "inherit", textDecoration: "none" }}>
              <Creature slug={h.slug} size={40} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="px" style={{ fontSize: 10 }}>{h.name.toUpperCase()}</span>
                <span className="px" style={{ fontSize: 8.5 }}>
                  <span style={{ color: RARITY_COLOR[h.rarity] }}>{h.rarity.toUpperCase()}</span>
                  {" · "}
                  {h.types.map((t, i) => <span key={t} style={{ color: ELEMENT_COLOR[t] }}>{i ? " / " : ""}{t.toUpperCase()}</span>)}
                  {h.hover ? <span style={{ color: "var(--muted)" }}> · HOVERS</span> : null}
                  {h.rnd ? <span style={{ color: "var(--muted)" }}> · ROLLS ITS TYPE</span> : null}
                  {h.shift ? <span style={{ color: "var(--muted)" }}> · CHANGES TYPE</span> : null}
                </span>
              </span>
              <span aria-hidden style={{ color: "var(--muted)" }}>›</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
