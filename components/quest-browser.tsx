"use client";

import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import type { ShownBadge } from "@/lib/badges";
import { CameraIcon } from "@/components/icons";
import { QuestRow } from "@/components/quest-sheet";

const MODES = [
  ["all", "ALL"],
  ["do", "JUST DO IT"],
  ["show", "SHOW IT"],
  ["with", "WITH SOMEONE"],
] as const;

/** Every quest in one list, one way to work through them. Filter by how a quest is done (on your own,
 *  by showing a post to a witch, or with someone), look at what is left or what is done, and tap one
 *  to do it. A quest with something pending says so. */
export function QuestBrowser({
  items,
  pending,
  initialMode,
}: {
  /** Open on one of the filters, e.g. "with" for the quests you do with someone. */
  initialMode?: (typeof MODES)[number][0];
  items: ShownBadge[];
  /** Quests with something waiting, by badge slug: what it is waiting on. */
  pending: Record<string, string>;
}) {
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<(typeof MODES)[number][0]>(initialMode ?? "all");
  const [q, setQ] = useState("");
  const [at, setAt] = useState<string | null>(null);
  const todo = items.filter((b) => b.locked);
  const done = items.filter((b) => !b.locked);
  const list = (tab === 0 ? todo : done)
    .filter((b) => mode === "all" || b.mode === mode)
    .filter((b) => !q.trim() || `${b.title} ${b.line}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="seg">
        <button type="button" data-on={tab === 0} onClick={() => setTab(0)}>TO DO · {todo.length}</button>
        <button type="button" data-on={tab === 1} onClick={() => setTab(1)}>DONE · {done.length}</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {MODES.map(([k, label]) => (
          <button key={k} type="button" className={`btn btn-sm${mode === k ? " btn-purple" : ""}`} onClick={() => setMode(k)} style={{ minHeight: 34, fontSize: 10 }}>
            {label}
          </button>
        ))}
      </div>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quests" aria-label="Search quests" style={{ width: "100%", fontSize: 12.5 }} />

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {list.length === 0 ? <li className="empty">{tab === 0 ? "NOTHING LEFT TO DO HERE" : "NONE YET"}</li> : null}
        {list.map((b) => {
          const slug = b.key.slice(2);
          return (
            <li key={b.key}>
              <QuestRow
                b={b}
                scan={!!b.peer && b.locked}
                face={<span style={{ display: "block", opacity: b.locked ? 0.85 : 1 }}><BadgeFace b={b} size={42} /></span>}
                rest={
                  <>
                    <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                      <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                        {b.title}
                        {b.peer && b.locked ? <span style={{ marginLeft: 6 }}><CameraIcon /></span> : null}
                        {b.auto ? <span aria-label="Awarded by the system" title="The system gives this one out itself" style={{ color: "#e8c14b", marginLeft: 6 }}>★</span> : null}
                      </span>
                      <span style={{ display: "block", fontSize: 11, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
                    </span>
                    {pending[slug] ? <span className="px" style={{ flex: "none", fontSize: 9.5, color: "var(--pur-pale)", textAlign: "right", maxWidth: 96, lineHeight: 1.4 }}>{pending[slug]}</span> : null}
                  </>
                }
              />
            </li>
          );
        })}
      </ul>

    </div>
  );
}
