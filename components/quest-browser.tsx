"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { claimBadge } from "@/lib/actions";
import type { ShownBadge } from "@/lib/badges";

/** Where each system badge is done, for the ones that have a place to go. */
const WHERE: Record<string, [string, string]> = {
  "top-five-full": ["/me/top-six", "PICK YOUR TOP 5"],
  "first-bio": ["/me/edit", "EDIT YOUR PROFILE"],
  "token-made": ["/me/token", "MAKE YOUR TOKEN"],
  "visit-the-well": ["/well", "GO TO THE WELL"],
  "vote-on-a-motion": ["/ball?tab=motions", "SEE THE MOTIONS"],
  "publish-an-op-ed": ["/ball", "GO TO THE BALL"],
  "first-trade": ["/me/trades", "YOUR TRADES"],
};

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
  people,
  pending,
}: {
  items: ShownBadge[];
  people: { id: string; handle: string }[];
  /** Quests with something waiting, by badge slug: what it is waiting on. */
  pending: Record<string, string>;
}) {
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("all");
  const [q, setQ] = useState("");
  const [at, setAt] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [who, setWho] = useState("");
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
          const sel = at === b.key;
          const where = WHERE[slug];
          return (
            <li key={b.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" aria-expanded={sel} onClick={() => setAt(sel ? null : b.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "left" }}>
                <span style={{ flex: "none", lineHeight: 0, opacity: b.locked ? 0.85 : 1 }}>
                  <BadgeFace b={b} size={42} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                    {b.title}
                    {b.auto ? <span aria-label="Awarded by the system" title="The system gives this one out itself" style={{ color: "#e8c14b", marginLeft: 6 }}>★</span> : null}
                  </span>
                  <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
                </span>
                {pending[slug] ? (
                  <span className="px" style={{ flex: "none", fontSize: 9.5, color: "var(--pur-pale)", textAlign: "right", maxWidth: 96, lineHeight: 1.4 }}>{pending[slug]}</span>
                ) : null}
              </button>
              {sel && b.locked ? (
                <div style={{ paddingLeft: 52, display: "flex", flexDirection: "column", gap: 6 }}>
                  {b.peer ? (
                    <>
                      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>
                        Pick who it was. They get a whisper asking whether it happened, with YES and NO. If they say yes, the badge is yours.
                      </div>
                      <button type="button" className="btn btn-sm btn-purple" onClick={() => setAsking(slug)} style={{ minHeight: 40, alignSelf: "flex-start" }}>
                        ASK SOMEONE →
                      </button>
                    </>
                  ) : b.request ? (
                    <>
                      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>
                        Make a post that shows it. It is marked as a badge request, and when a witch likes it, the badge is yours.
                      </div>
                      <Link href={`/post?badge=${slug}`} className="btn btn-sm btn-purple" style={{ minHeight: 40, alignSelf: "flex-start", display: "inline-flex", alignItems: "center" }}>
                        MAKE THE POST →
                      </Link>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>You get this one on your own, the moment it is true.</div>
                      {where ? (
                        <Link href={where[0]} className="btn btn-sm" style={{ minHeight: 40, alignSelf: "flex-start", display: "inline-flex", alignItems: "center" }}>
                          {where[1]} →
                        </Link>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {asking ? (
        <div role="dialog" aria-label="Who was it?" style={{ position: "fixed", inset: 0, zIndex: 80, maxWidth: 480, margin: "0 auto", background: "var(--device)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 8px" }}>
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>WHO WAS IT?</div>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => setAsking(null)} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>✕</button>
          </div>
          <div style={{ padding: "0 16px 8px" }}>
            <input className="input" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Search for someone" aria-label="Search people" style={{ width: "100%", fontSize: 12.5 }} />
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: "0 16px 24px", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {people.filter((p) => !who.trim() || p.handle.toLowerCase().includes(who.trim().toLowerCase())).map((p) => (
              <li key={p.id}>
                <form action={async (fd) => { await claimBadge(fd); setAsking(null); }}>
                  <input type="hidden" name="slug" value={asking} />
                  <input type="hidden" name="other_id" value={p.id} />
                  <button type="submit" className="btn btn-block" style={{ minHeight: 46, justifyContent: "flex-start" }}>{p.handle}</button>
                </form>
              </li>
            ))}
            {people.length === 0 ? <li className="empty">THERE IS NOBODY ELSE IN THE CITY YET</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
