"use client";

import { useState } from "react";
import { BadgeArt } from "@/components/badges";
import { ROMAN, type BadgeRow } from "@/lib/badges";
import { setStarBadges } from "@/lib/actions";

/** Pick the four badges for your star row: tap to add (in the order tapped), tap again to take off. */
export function StarChooser({ earned, picked }: { earned: BadgeRow[]; picked: string[] }) {
  const [list, setList] = useState<string[]>(picked.filter((s) => earned.some((b) => b.slug === s)).slice(0, 4));
  const toggle = (slug: string) => setList((l) => (l.includes(slug) ? l.filter((s) => s !== slug) : l.length >= 4 ? l : [...l, slug]));
  return (
    <form action={setStarBadges} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="list" value={JSON.stringify(list)} />
      <div className="px" style={{ fontSize: 10, color: "#e0398a" }}>{list.length}/4 PICKED{list.length === 4 ? " · TAP ONE TO TAKE IT OFF" : ""}</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
        {earned.map((b) => {
          const n = list.indexOf(b.slug);
          return (
            <li key={b.slug}>
              <button type="button" onClick={() => toggle(b.slug)} aria-pressed={n >= 0} aria-label={b.title}
                style={{ width: "100%", border: 0, background: "none", color: "inherit", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, outline: n >= 0 ? "3px solid var(--pur-bright)" : "none", outlineOffset: -3, opacity: n < 0 && list.length >= 4 ? 0.45 : 1 }}>
                <BadgeArt b={b} got tier={b.tier} size={42} />
                <span className="px" style={{ fontSize: 8, textAlign: "center", lineHeight: 1.4 }}>{b.title}{b.tiers > 1 && b.tier ? ` ${ROMAN[b.tier]}` : ""}</span>
                <span className="px" style={{ fontSize: 8, color: "#e0398a", minHeight: 9 }}>{n >= 0 ? n + 1 : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn" style={{ background: "#e0398a", color: "#fff", flex: 1 }}>SAVE</button>
        <button type="button" className="btn" onClick={() => setList([])}>CLEAR</button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>With none picked, your star row shows your four newest badges.</p>
    </form>
  );
}
