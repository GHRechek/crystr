"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/bits";
import { targetLabel } from "@/lib/species";
import type { Author } from "@/lib/data";

type Row = { person: Author; species: string | null; spellcaster: boolean; witch: boolean };

const KINDS = ["elf", "forsaken", "shifter", "human", "orc", "goblin", "planar", "spellcaster", "witch"];

const matches = (r: Row, k: string) => (k === "spellcaster" ? r.spellcaster : k === "witch" ? r.witch : r.species === k);

/** A search box and a row of icons to narrow by kind. Several can be on at once: anyone who is any of them. */
export function PeopleSearch({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [on, setOn] = useState<string[]>([]);
  const text = q.trim().toLowerCase();
  const list = rows.filter(
    (r) =>
      (!on.length || on.some((k) => matches(r, k))) &&
      (!text || r.person.handle.toLowerCase().includes(text) || (r.person.display_name ?? "").toLowerCase().includes(text)),
  );
  return (
    <>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search people" style={{ width: "100%", fontSize: 12.5 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px 10px" }}>
        {KINDS.map((k) => {
          const active = on.includes(k);
          return (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36, fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={active} onChange={() => setOn((x) => (active ? x.filter((y) => y !== k) : [...x, k]))} style={{ width: 18, height: 18, accentColor: "var(--pur)" }} />
              {targetLabel(k)}
            </label>
          );
        })}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {list.length === 0 ? <li className="empty">NOBODY MATCHES</li> : null}
        {list.map((r) => (
          <li key={r.person.id}>
            <Link href={`/u/${r.person.handle}`} className="rowcard" style={{ minHeight: 52, padding: "8px 11px", gap: 10 }}>
              <Avatar person={r.person} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{r.person.handle}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {[r.species ? targetLabel(r.species) : null, r.spellcaster ? "casts spells" : null, r.witch ? "witch" : null].filter(Boolean).join(" · ")}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
