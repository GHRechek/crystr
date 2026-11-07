"use client";

import { useState } from "react";
import { Avatar } from "@/components/bits";
import { BadgeFace } from "@/components/badge-chooser";
import { witchGrant } from "@/lib/actions";
import type { Author } from "@/lib/data";
import type { ShownBadge } from "@/lib/badges";

/** On someone else's profile, a witch taps their picture for a menu: mark one of their quests as done.
 *  Everyone else just sees the picture. */
export function WitchFace({ person, quests }: { person: Author; quests: ShownBadge[] }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<ShownBadge | null>(null);
  const text = q.trim().toLowerCase();
  const list = quests.filter((b) => !text || b.title.toLowerCase().includes(text) || b.line.toLowerCase().includes(text));

  return (
    <div style={{ position: "relative", width: 104, height: 104, flex: "none" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Witch: mark a quest done for them"
        style={{ width: 104, height: 104, padding: 0, border: 0, background: "transparent", cursor: "pointer", borderRadius: "var(--px-r)", boxShadow: open ? "0 0 0 3px var(--device), 0 0 0 5px var(--pur)" : "none", lineHeight: 0 }}
      >
        <Avatar person={person} size={104} />
      </button>
      {open ? (
        <div className="face-menu" role="menu" style={{ width: 230 }}>
          <button type="button" className="face-menu-item" role="menuitem" onClick={() => { setOpen(false); setSheet(true); }}>
            <span aria-hidden="true">✓</span> MARK A QUEST DONE
          </button>
        </div>
      ) : null}

      {sheet ? (
        <div role="dialog" aria-label="Mark a quest done" style={{ position: "fixed", inset: 0, zIndex: 90, maxWidth: 480, margin: "0 auto", background: "var(--device)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 8px", gap: 8 }}>
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>DONE BY {person.handle.toUpperCase()}</div>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => { setSheet(false); setPick(null); }} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>✕</button>
          </div>
          <div style={{ padding: "0 16px 8px", fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>Tap a quest they have done. It is theirs the moment you say so, no post or scan needed.</div>
          <div style={{ padding: "0 16px 8px" }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quests" aria-label="Search quests" style={{ width: "100%", fontSize: 12.5 }} />
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: "0 16px 24px", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {list.length === 0 ? <li className="empty">NOTHING LEFT TO MARK</li> : null}
            {list.map((b) => (
              <li key={b.key}>
                <button type="button" onClick={() => setPick(b)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "8px 10px", background: "var(--blk)", border: 0, borderRadius: "var(--px-r)", color: "inherit", font: "inherit", cursor: "pointer" }}>
                  <span style={{ flex: "none", lineHeight: 0, opacity: 0.85 }}><BadgeFace b={b} size={36} /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="px" style={{ display: "block", fontSize: 11, lineHeight: 1.5 }}>{b.title}</span>
                    <span style={{ display: "block", fontSize: 11, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {pick ? (
            <div role="dialog" aria-label="Confirm" onClick={() => setPick(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: 24 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "min(320px, 100%)", background: "var(--blk)", border: 0, borderRadius: "var(--px-r)", padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
                <BadgeFace b={pick} size={56} />
                <div className="px" style={{ fontSize: 12 }}>{pick.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>Say {person.handle} has done this?</div>
                <form action={async (fd) => { await witchGrant(fd); setPick(null); setSheet(false); }} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="user_id" value={person.id} />
                  <input type="hidden" name="handle" value={person.handle} />
                  <input type="hidden" name="slug" value={pick.key.slice(2)} />
                  <button type="submit" className="btn btn-purple" style={{ minHeight: 44 }}>YES, DONE</button>
                  <button type="button" className="btn" onClick={() => setPick(null)} style={{ minHeight: 44 }}>NOT YET</button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
