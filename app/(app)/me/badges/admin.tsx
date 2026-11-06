"use client";

import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { BadgeEditor, type BadgeDraft } from "@/components/badge-editor";
import type { ShownBadge } from "@/lib/badges";

/** Every badge as a row: the picture, the name, how it is earned, and a pen. ★ marks the ones the
 *  system hands out itself (their words and picture can be changed, how they are earned cannot). */
export function BadgeAdmin({ items }: { items: ShownBadge[] }) {
  const [draft, setDraft] = useState<BadgeDraft | null>(null);
  const [q, setQ] = useState("");
  const shown = items.filter((b) => !q.trim() || `${b.title} ${b.line}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search badges" aria-label="Search badges" style={{ flex: 1, minWidth: 0, fontSize: 12.5 }} />
        <button type="button" className="btn btn-sm btn-purple" onClick={() => setDraft({ title: "", how: "", blurb: "", art: 1 })} style={{ minHeight: 44, flex: "none" }}>
          + NEW BADGE
        </button>
      </div>
      <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
        {shown.length} BADGES · ★ AWARDED BY THE SYSTEM
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((b) => (
          <li key={b.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "none", lineHeight: 0 }}>
              <BadgeFace b={b} size={42} />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                {b.title}
                {b.auto ? <span title="Awarded by the system" aria-label="Awarded by the system" style={{ color: "#e8c14b", marginLeft: 6 }}>★</span> : null}
              </span>
              <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{b.badge ? b.edit?.how : b.line}</span>
            </span>
            <button type="button" className="btn btn-sm" aria-label={`Edit ${b.title}`} onClick={() => b.edit && setDraft({ ...b.edit })} style={{ flex: "none", minHeight: 36, minWidth: 36, padding: 0 }}>
              ✎
            </button>
          </li>
        ))}
      </ul>
      {draft ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, maxWidth: 480, margin: "0 auto", background: "var(--device)" }}>
          <BadgeEditor draft={draft} setDraft={setDraft} used={items.flatMap((x) => (x.edit && !x.edit.custom && x.edit.slug !== draft.slug ? [x.edit.art] : []))} />
        </div>
      ) : null}
    </div>
  );
}
